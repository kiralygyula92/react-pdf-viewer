'use client';

/**
 * React PDF viewer built on `pdfjs-dist`.
 *
 * Styles ship separately: import `@your-scope/react-pdf-viewer/styles.css` once in your app.
 *
 * @packageDocumentation
 */

import './styles/pdf-viewer.css';
import './styles/features.css';

export { PdfViewer } from './PdfViewer.js';
export { PdfToolbar, type PdfToolbarProps } from './components/Toolbar.js';
export { PdfPageCanvas, type PdfPageCanvasProps } from './components/PdfPageCanvas.js';
export { configurePdfJs, type PdfJsConfig, type PdfJsModule } from './core/pdfjs.js';
export type { FitOptions } from './core/geometry.js';
export { defaultLabels, type LabelContext, type PdfViewerLabels } from './labels.js';
export {
  usePdfDocument,
  type UsePdfDocumentOptions,
  type UsePdfDocumentResult,
} from './hooks/usePdfDocument.js';
export type { PageHighlight, PageRenderInfo } from './hooks/usePageRenderer.js';
export {
  useControllableState,
  type SetControllableState,
  type UseControllableStateOptions,
} from './hooks/useControllableState.js';
export type {
  FullscreenMode,
  PdfDocumentStatus,
  PdfJsDocumentOptions,
  PdfRequestOptions,
  PdfSource,
  PdfViewerApi,
  PdfViewerError,
  PdfViewerErrorCode,
  PdfViewerProps,
  Rotation,
  ToolbarAction,
  ToolbarConfig,
} from './types.js';
