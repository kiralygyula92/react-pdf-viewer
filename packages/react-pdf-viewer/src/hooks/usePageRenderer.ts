import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type {
  PageViewport,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
  TextLayer,
} from 'pdfjs-dist';
import { isRenderCancelled, toPdfViewerError } from '../core/errors.js';
import {
  clampPage,
  DEFAULT_MAX_CANVAS_PIXELS,
  effectiveRotation,
  fitScale,
  getOutputScale,
  type FitOptions,
} from '../core/geometry.js';
import { createLinkService } from '../core/linkService.js';
import { loadPdfJs, type PdfJsModule } from '../core/pdfjs.js';
import {
  buildPageText,
  findMatches,
  isTextItem,
  toItemSegments,
  type PageText,
} from '../core/search.js';
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

/** Search highlighting for one page's text layer. */
export interface PageHighlight {
  /** Text to highlight (case-insensitive). */
  query: string;
  /** Index of the page's match to mark as selected, if any. */
  selected: number | null;
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
  /** Render a selectable text layer. */
  textLayer?: boolean | undefined;
  /** Render link annotations. */
  annotationLayer?: boolean | undefined;
  /** Highlight search matches in the text layer. */
  highlight?: PageHighlight | undefined;
  /** Called when an internal link targets a page. */
  onLinkNavigate?: ((page: number) => void) | undefined;
  /** Called with the selected highlight element, so it can be scrolled into view. */
  onHighlight?: ((element: HTMLElement) => void) | undefined;
  onRender?: ((info: PageRenderInfo) => void) | undefined;
  onError?: ((error: PdfViewerError) => void) | undefined;
}

/** Refs to attach and render state returned by {@link usePageRenderer}. */
export interface UsePageRendererResult {
  /** The page box; the renderer sets its CSS width and height. */
  pageRef: RefObject<HTMLDivElement | null>;
  /** Element that receives the canvas. Must have no React children. */
  canvasHostRef: RefObject<HTMLDivElement | null>;
  /** Element that receives the text and annotation layers. Must have no React children. */
  layersRef: RefObject<HTMLDivElement | null>;
  /** The last render failure, cleared by the next successful render. */
  error: PdfViewerError | null;
  /** Renders again after a failure. */
  retry: () => void;
}

type AnnotationLayerInstance = InstanceType<PdfJsModule['AnnotationLayer']>;
type AnnotationRenderParameters = Parameters<AnnotationLayerInstance['render']>[0];

interface TextLayerState {
  divs: HTMLElement[];
  pageText: PageText;
  highlighted: Set<number>;
}

interface BuiltTextLayer {
  container: HTMLDivElement;
  state: TextLayerState;
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

async function buildTextLayer(
  lib: PdfJsModule,
  page: PDFPageProxy,
  viewport: PageViewport,
  ownerDocument: Document,
  track: (layer: TextLayer) => void,
): Promise<BuiltTextLayer> {
  const content = await page.getTextContent();
  const container = ownerDocument.createElement('div');
  container.className = 'textLayer';
  const layer = new lib.TextLayer({ textContentSource: content, container, viewport });
  track(layer);
  await layer.render();
  // Lets a selection drag past the last line without jumping (as in PDF.js).
  const end = ownerDocument.createElement('div');
  end.className = 'endOfContent';
  container.append(end);
  container.addEventListener('mousedown', () => {
    container.classList.add('selecting');
    ownerDocument.addEventListener('mouseup', () => container.classList.remove('selecting'), {
      once: true,
    });
  });
  return {
    container,
    state: {
      divs: layer.textDivs,
      pageText: buildPageText(content.items.filter(isTextItem)),
      highlighted: new Set(),
    },
  };
}

async function buildAnnotationLayer(
  lib: PdfJsModule,
  pdf: PDFDocumentProxy,
  page: PDFPageProxy,
  viewport: PageViewport,
  linkService: ReturnType<typeof createLinkService>,
  ownerDocument: Document,
): Promise<HTMLDivElement> {
  const annotations = await page.getAnnotations({ intent: 'display' });
  const div = ownerDocument.createElement('div');
  div.className = 'annotationLayer';
  if (annotations.length === 0) return div;
  const annotationViewport = viewport.clone({ dontFlip: true });
  const service = linkService as unknown as AnnotationRenderParameters['linkService'];
  const layer = new lib.AnnotationLayer({
    div,
    accessibilityManager: null,
    annotationCanvasMap: null,
    annotationEditorUIManager: null,
    page,
    viewport: annotationViewport,
    structTreeLayer: null,
    commentManager: null,
    linkService: service,
    annotationStorage: pdf.annotationStorage,
  });
  await layer.render({
    viewport: annotationViewport,
    div,
    annotations,
    page,
    linkService: service,
    renderForms: false,
    annotationStorage: pdf.annotationStorage,
  });
  return div;
}

/** Rewrites the text layer's spans to wrap matches; returns the selected match's element. */
function applyHighlights(
  state: TextLayerState,
  highlight: PageHighlight | undefined,
): HTMLElement | null {
  const { divs, pageText, highlighted } = state;
  for (const index of highlighted) {
    const div = divs[index];
    if (div) div.textContent = pageText.items[index] ?? '';
  }
  highlighted.clear();
  if (!highlight?.query.trim()) return null;

  const segmentsByItem = new Map<number, { start: number; end: number; selected: boolean }[]>();
  findMatches(pageText, highlight.query).forEach((range, matchIndex) => {
    for (const segment of toItemSegments(pageText, range)) {
      const list = segmentsByItem.get(segment.item) ?? [];
      list.push({
        start: segment.start,
        end: segment.end,
        selected: matchIndex === highlight.selected,
      });
      segmentsByItem.set(segment.item, list);
    }
  });

  let selectedElement: HTMLElement | null = null;
  for (const [index, segments] of segmentsByItem) {
    const div = divs[index];
    const text = pageText.items[index];
    if (!div || text === undefined) continue;
    highlighted.add(index);
    div.textContent = '';
    let position = 0;
    for (const segment of segments.sort((a, b) => a.start - b.start)) {
      if (segment.start > position) div.append(text.slice(position, segment.start));
      const mark = div.ownerDocument.createElement('span');
      mark.className = segment.selected ? 'highlight selected appended' : 'highlight appended';
      mark.textContent = text.slice(segment.start, segment.end);
      div.append(mark);
      if (segment.selected) selectedElement ??= mark;
      position = segment.end;
    }
    if (position < text.length) div.append(text.slice(position));
  }
  return selectedElement;
}

/**
 * Renders one PDF page onto a canvas, optionally with text and annotation layers.
 *
 * - One render at a time: a newer request cancels the running `RenderTask` (cancellations are
 *   silent), so bursts of changes complete exactly one render.
 * - Double-buffered: the canvas and its layers are built off-screen and swapped in together, so
 *   there is no blank frame.
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
  textLayer = false,
  annotationLayer = false,
  highlight,
  onLinkNavigate,
  onHighlight,
  onRender,
  onError,
}: UsePageRendererOptions): UsePageRendererResult {
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const displayedPageRef = useRef<PDFPageProxy | null>(null);
  const textStateRef = useRef<TextLayerState | null>(null);
  const [error, setError] = useState<PdfViewerError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [layerVersion, setLayerVersion] = useState(0);
  const devicePixelRatio = useDevicePixelRatio();

  const latest = useRef({ onRender, onError, onLinkNavigate, onHighlight, page });
  useIsomorphicLayoutEffect(() => {
    latest.current = { onRender, onError, onLinkNavigate, onHighlight, page };
  });

  const fitWidth = fit?.width;
  const fitHeight = fit?.height;
  const fitUpscale = fit?.upscale ?? false;

  useEffect(() => {
    const pageElement = pageRef.current;
    const host = canvasHostRef.current;
    const layersHost = layersRef.current;
    if (!document || !pageElement || !host || !layersHost) {
      return;
    }
    let cancelled = false;
    let task: RenderTask | null = null;
    let pendingTextLayer: TextLayer | null = null;
    const startedAt = performance.now();
    const ownerDocument = pageElement.ownerDocument;
    const linkService = createLinkService(document, {
      goToPage: (target) => latest.current.onLinkNavigate?.(target),
      getPage: () => latest.current.page,
    });

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

      // Layers are optional extras: a failure there must not break the page.
      const layers =
        textLayer || annotationLayer
          ? loadPdfJs()
              .then((lib) =>
                Promise.all([
                  textLayer
                    ? buildTextLayer(lib, pdfPage, viewport, ownerDocument, (layer) => {
                        pendingTextLayer = layer;
                      })
                    : null,
                  annotationLayer
                    ? buildAnnotationLayer(
                        lib,
                        document,
                        pdfPage,
                        viewport,
                        linkService,
                        ownerDocument,
                      )
                    : null,
                ]),
              )
              .catch(() => [null, null] as const)
          : Promise.resolve([null, null] as const);

      const outputScale = getOutputScale(
        viewport.width,
        viewport.height,
        devicePixelRatio,
        maxCanvasPixels,
      );
      const canvas = ownerDocument.createElement('canvas');
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
      const [builtText, annotationDiv] = await layers;
      if (cancelled) {
        releaseCanvas(canvas);
        return;
      }

      const previousCanvas = host.firstElementChild;
      host.replaceChildren(canvas);
      releaseCanvas(previousCanvas);
      layersHost.replaceChildren(
        ...[builtText?.container, annotationDiv].filter((node): node is HTMLDivElement =>
          Boolean(node),
        ),
      );
      pageElement.style.width = `${viewport.width}px`;
      pageElement.style.height = `${viewport.height}px`;
      pageElement.style.setProperty('--total-scale-factor', String(renderScale * pdfPage.userUnit));

      const previousPage = displayedPageRef.current;
      displayedPageRef.current = pdfPage;
      if (previousPage && previousPage !== pdfPage) {
        previousPage.cleanup();
      }

      textStateRef.current = builtText?.state ?? null;
      if (builtText) setLayerVersion((value) => value + 1);
      setError((current) => (current === null ? current : null));
      latest.current.onRender?.({
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
      latest.current.onError?.(renderError);
    });

    return () => {
      cancelled = true;
      task?.cancel();
      (pendingTextLayer as TextLayer | null)?.cancel();
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
    textLayer,
    annotationLayer,
    attempt,
  ]);

  // Search highlights are applied to the current text layer, without re-rendering the page.
  const highlightQuery = highlight?.query ?? '';
  const highlightSelected = highlight?.selected ?? null;
  useEffect(() => {
    const state = textStateRef.current;
    if (!state) return;
    const selected = applyHighlights(
      state,
      highlightQuery ? { query: highlightQuery, selected: highlightSelected } : undefined,
    );
    if (selected) latest.current.onHighlight?.(selected);
  }, [highlightQuery, highlightSelected, layerVersion]);

  // Release the canvas and layers when the document changes or the component unmounts.
  useEffect(() => {
    const host = canvasHostRef.current;
    const layersHost = layersRef.current;
    return () => {
      releaseCanvas(host?.firstElementChild);
      host?.replaceChildren();
      layersHost?.replaceChildren();
      displayedPageRef.current = null;
      textStateRef.current = null;
    };
  }, [document]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  return { pageRef, canvasHostRef, layersRef, error, retry };
}
