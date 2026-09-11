import { memo, type CSSProperties, type ReactNode } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { FitOptions } from '../core/geometry.js';
import {
  usePageRenderer,
  type PageHighlight,
  type PageRenderInfo,
} from '../hooks/usePageRenderer.js';
import type { PdfViewerError, Rotation } from '../types.js';

/** Props for {@link PdfPageCanvas}. */
export interface PdfPageCanvasProps {
  /** A loaded document, e.g. from `usePdfDocument`. */
  document: PDFDocumentProxy;
  /** 1-based page number; clamped to the document. */
  page: number;
  /** Scale, 1 = 100%. Default `1`. */
  scale?: number | undefined;
  /** User rotation, added to the page's intrinsic rotation. Default `0`. */
  rotation?: Rotation | undefined;
  /** Box the page must fit into (see {@link FitOptions}). */
  fit?: FitOptions | undefined;
  /** Canvas pixel budget. Default `16_777_216`. */
  maxCanvasPixels?: number | undefined;
  /** Render a selectable text layer (copy, find, assistive technology). Default `false`. */
  textLayer?: boolean | undefined;
  /** Render clickable links. Default `false`. */
  annotationLayer?: boolean | undefined;
  /** Highlight search matches (requires `textLayer`). */
  highlight?: PageHighlight | undefined;
  /** Called when an internal link targets another page. */
  onLinkNavigate?: ((page: number) => void) | undefined;
  /** Called with the selected search match's element (e.g. to scroll it into view). */
  onHighlight?: ((element: HTMLElement) => void) | undefined;
  /**
   * Accessible name, e.g. `Page 1 of 3`. With a name the page is exposed as an image (or, with
   * a text layer, as a group containing the text); without one it is decorative.
   */
  'aria-label'?: string | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  /** Replaces the default in-place error view. */
  renderError?: ((error: PdfViewerError, actions: { retry: () => void }) => ReactNode) | undefined;
  /** Called after each completed render. */
  onRender?: ((info: PageRenderInfo) => void) | undefined;
  /** Called when rendering fails (cancellations are not failures). */
  onError?: ((error: PdfViewerError) => void) | undefined;
}

function PdfPageCanvasImpl({
  document,
  page,
  scale = 1,
  rotation = 0,
  fit,
  maxCanvasPixels,
  textLayer = false,
  annotationLayer = false,
  highlight,
  onLinkNavigate,
  onHighlight,
  'aria-label': ariaLabel,
  className,
  style,
  renderError,
  onRender,
  onError,
}: PdfPageCanvasProps) {
  const { pageRef, canvasHostRef, layersRef, error, retry } = usePageRenderer({
    document,
    page,
    scale,
    rotation,
    fit,
    maxCanvasPixels,
    textLayer,
    annotationLayer,
    highlight,
    onLinkNavigate,
    onHighlight,
    onRender,
    onError,
  });

  const labelled = ariaLabel !== undefined && !error;
  return (
    <div
      ref={pageRef}
      className={className ? `rpv-page ${className}` : 'rpv-page'}
      style={style}
      role={labelled ? (textLayer ? 'group' : 'img') : undefined}
      aria-label={labelled ? ariaLabel : undefined}
      data-state={error ? 'error' : undefined}
    >
      <div ref={canvasHostRef} className="rpv-page__canvas-host" />
      <div ref={layersRef} className="rpv-page__layers" />
      {error &&
        (renderError ? (
          renderError(error, { retry })
        ) : (
          <div className="rpv-page__error" role="alert">
            {error.message}
          </div>
        ))}
    </div>
  );
}

/**
 * Renders a single PDF page: cancellable, double-buffered, HiDPI and pixel-capped, with optional
 * text and annotation layers. The building block for custom viewers (see `usePdfDocument`).
 */
export const PdfPageCanvas = memo(PdfPageCanvasImpl);
