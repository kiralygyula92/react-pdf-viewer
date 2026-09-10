import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
import { isRenderCancelled, toPdfViewerError } from '../core/errors.js';
import {
  clampPage,
  DEFAULT_MAX_CANVAS_PIXELS,
  effectiveRotation,
  fitScale,
  getOutputScale,
  type FitOptions,
} from '../core/geometry.js';
import type { PdfViewerError, Rotation } from '../types.js';
import { useDevicePixelRatio } from './useDevicePixelRatio.js';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect.js';

/** Details of a completed page render. */
export interface PageRenderInfo {
  /** 1-based page number that was rendered (after clamping). */
  page: number;
  /** Scale actually rendered (after fitting). */
  scale: number;
  /** Rendered CSS width in pixels. */
  width: number;
  /** Rendered CSS height in pixels. */
  height: number;
  /** Time from request to completion. */
  durationMs: number;
}

/** Options for {@link usePageRenderer}. */
export interface UsePageRendererOptions {
  document: PDFDocumentProxy | null;
  /** 1-based page number; clamped to the document. */
  page: number;
  /** Requested scale (1 = 100%). */
  scale: number;
  /** User rotation, added to the page's intrinsic rotation. */
  rotation: Rotation;
  /** Optional box the page must fit into. */
  fit?: FitOptions | undefined;
  /** Canvas pixel budget. Default {@link DEFAULT_MAX_CANVAS_PIXELS}. */
  maxCanvasPixels?: number | undefined;
  onRender?: ((info: PageRenderInfo) => void) | undefined;
  onError?: ((error: PdfViewerError) => void) | undefined;
}

/** Refs to attach and render state returned by {@link usePageRenderer}. */
export interface UsePageRendererResult {
  /** The page box; the renderer sets its CSS width and height. */
  pageRef: RefObject<HTMLDivElement | null>;
  /** Element that receives the canvas. Must have no React children. */
  canvasHostRef: RefObject<HTMLDivElement | null>;
  /** The last render failure, cleared by the next successful render. */
  error: PdfViewerError | null;
  /** Renders again after a failure. */
  retry: () => void;
}

function releaseCanvas(canvas: Element | null | undefined): void {
  if (canvas instanceof HTMLCanvasElement) {
    // Frees the backing store immediately (Safari otherwise holds on to it).
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** Border + padding of the page box, which the fitted canvas must leave room for. */
function measureChrome(element: HTMLElement): { x: number; y: number } {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const px = (value: string | undefined) => Number.parseFloat(value ?? '') || 0;
  return {
    x: element.offsetWidth - element.clientWidth + px(style?.paddingLeft) + px(style?.paddingRight),
    y:
      element.offsetHeight -
      element.clientHeight +
      px(style?.paddingTop) +
      px(style?.paddingBottom),
  };
}

/**
 * Renders one PDF page onto a canvas.
 *
 * - One render at a time: a newer request cancels the running `RenderTask` (cancellations are
 *   silent), so bursts of changes complete exactly one render.
 * - Double-buffered: each render draws into a detached canvas that replaces the visible one only
 *   when complete, so there is no blank frame.
 * - HiDPI output, capped at `maxCanvasPixels`; re-renders when the device pixel ratio changes.
 * - The renderer is the single owner of the page's CSS size.
 */
export function usePageRenderer({
  document,
  page,
  scale,
  rotation,
  fit,
  maxCanvasPixels = DEFAULT_MAX_CANVAS_PIXELS,
  onRender,
  onError,
}: UsePageRendererOptions): UsePageRendererResult {
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const displayedPageRef = useRef<PDFPageProxy | null>(null);
  const [error, setError] = useState<PdfViewerError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const devicePixelRatio = useDevicePixelRatio();

  const callbacks = useRef({ onRender, onError });
  useIsomorphicLayoutEffect(() => {
    callbacks.current = { onRender, onError };
  });

  const fitWidth = fit?.width;
  const fitHeight = fit?.height;
  const fitUpscale = fit?.upscale ?? false;

  useEffect(() => {
    const pageElement = pageRef.current;
    const host = canvasHostRef.current;
    if (!document || !pageElement || !host) {
      return;
    }
    let cancelled = false;
    let task: RenderTask | null = null;
    const startedAt = performance.now();

    const render = async () => {
      const pdfPage = await document.getPage(clampPage(page, document.numPages));
      if (cancelled) {
        return;
      }
      const pageRotation = effectiveRotation(pdfPage.rotate, rotation);
      const base = pdfPage.getViewport({ scale: 1, rotation: pageRotation });
      const chrome = measureChrome(pageElement);
      const renderScale = fitScale(scale, base.width, base.height, {
        width: fitWidth === undefined ? undefined : fitWidth - chrome.x,
        height: fitHeight === undefined ? undefined : fitHeight - chrome.y,
        upscale: fitUpscale,
      });
      const viewport = pdfPage.getViewport({ scale: renderScale, rotation: pageRotation });
      const outputScale = getOutputScale(
        viewport.width,
        viewport.height,
        devicePixelRatio,
        maxCanvasPixels,
      );

      const canvas = pageElement.ownerDocument.createElement('canvas');
      canvas.className = 'rpv-page__canvas';
      canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
      canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
      Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%' });

      task = pdfPage.render({
        canvas,
        viewport,
        ...(outputScale === 1 ? {} : { transform: [outputScale, 0, 0, outputScale, 0, 0] }),
      });
      try {
        await task.promise;
      } catch (renderError) {
        releaseCanvas(canvas);
        throw renderError;
      }
      if (cancelled) {
        releaseCanvas(canvas);
        return;
      }

      const previousCanvas = host.firstElementChild;
      host.replaceChildren(canvas);
      releaseCanvas(previousCanvas);
      pageElement.style.width = `${viewport.width}px`;
      pageElement.style.height = `${viewport.height}px`;

      const previousPage = displayedPageRef.current;
      displayedPageRef.current = pdfPage;
      if (previousPage && previousPage !== pdfPage) {
        previousPage.cleanup();
      }

      setError((current) => (current === null ? current : null));
      callbacks.current.onRender?.({
        page: pdfPage.pageNumber,
        scale: renderScale,
        width: viewport.width,
        height: viewport.height,
        durationMs: performance.now() - startedAt,
      });
    };

    render().catch((cause: unknown) => {
      if (cancelled || isRenderCancelled(cause)) {
        return;
      }
      const renderError = toPdfViewerError(cause, 'RENDER_FAILED');
      setError(renderError);
      callbacks.current.onError?.(renderError);
    });

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [
    document,
    page,
    scale,
    rotation,
    fitWidth,
    fitHeight,
    fitUpscale,
    devicePixelRatio,
    maxCanvasPixels,
    attempt,
  ]);

  // Release the canvas when the document changes or the component unmounts.
  useEffect(() => {
    const host = canvasHostRef.current;
    return () => {
      releaseCanvas(host?.firstElementChild);
      host?.replaceChildren();
      displayedPageRef.current = null;
    };
  }, [document]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  return { pageRef, canvasHostRef, error, retry };
}
