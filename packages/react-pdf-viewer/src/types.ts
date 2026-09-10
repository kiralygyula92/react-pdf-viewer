import type { getDocument, PDFDocumentProxy } from 'pdfjs-dist';
import type { CSSProperties, ReactNode } from 'react';
import type { PageRenderInfo } from './hooks/usePageRenderer.js';
import type { PdfViewerLabels } from './labels.js';

/**
 * A PDF document source.
 *
 * - `string` / `URL`: fetched by the viewer (see {@link PdfRequestOptions}).
 * - `ArrayBuffer` / `Uint8Array` / `Blob` (including `File`): read directly, nothing is uploaded.
 *
 * Strings compare by value; every other source compares by identity, so keep binary sources
 * referentially stable (e.g. in state) to avoid reloading on every render.
 */
export type PdfSource = string | URL | ArrayBuffer | Uint8Array | Blob;

/** Clockwise rotation in degrees, relative to the page's natural orientation. */
export type Rotation = 0 | 90 | 180 | 270;

/**
 * How fullscreen is presented.
 *
 * - `'controlled'`: layout-only; the parent decides how to present fullscreen (original behavior).
 * - `'native'`: the browser Fullscreen API on the viewer root, falling back to `'overlay'`.
 * - `'overlay'`: a fixed, full-viewport layer with a focus trap; `Esc` closes it.
 */
export type FullscreenMode = 'controlled' | 'native' | 'overlay';

/** Identifies a toolbar control. */
export type ToolbarAction =
  | 'zoomOut'
  | 'zoomLevel'
  | 'zoomIn'
  | 'previousPage'
  | 'pageIndicator'
  | 'nextPage'
  | 'fullscreen'
  | 'rotate'
  | 'download'
  | 'print';

/** Lifecycle status of a document load. */
export type PdfDocumentStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Machine-readable category of a {@link PdfViewerError}. */
export type PdfViewerErrorCode =
  /** The `pdfjs-dist` module or its worker failed to load. */
  | 'PDFJS_LOAD_FAILED'
  /** `fetch` rejected (offline, CORS, DNS, …). */
  | 'NETWORK_ERROR'
  /** The server answered with a non-2xx status (`status` is set). */
  | 'HTTP_ERROR'
  /** The bytes are not a valid PDF. */
  | 'INVALID_PDF'
  /** The document is encrypted and no password was supplied. */
  | 'PASSWORD_REQUIRED'
  /** The supplied password is wrong. */
  | 'INCORRECT_PASSWORD'
  /** A page failed to render. */
  | 'RENDER_FAILED'
  /** Saving the document failed. */
  | 'DOWNLOAD_FAILED'
  /** Printing failed. */
  | 'PRINT_FAILED'
  /** Anything else. */
  | 'UNKNOWN';

/**
 * A typed viewer error. Aborted loads and cancelled renders are never reported as errors.
 */
export interface PdfViewerError {
  /** Error category. */
  readonly code: PdfViewerErrorCode;
  /** Human-readable message. For `HTTP_ERROR` it comes from `getHttpErrorMessage`. */
  readonly message: string;
  /** HTTP status, for `HTTP_ERROR`. */
  readonly status?: number;
  /** The underlying error, when there is one. */
  readonly cause?: unknown;
}

type DocumentInitParameters = NonNullable<Parameters<typeof getDocument>[0]>;

/**
 * Per-instance options forwarded to `pdfjs-dist`'s `getDocument` (for example `cMapUrl`,
 * `standardFontDataUrl` or `verbosity`). Source-related options are managed by the viewer.
 */
export type PdfJsDocumentOptions = Omit<
  DocumentInitParameters,
  'url' | 'data' | 'password' | 'range' | 'worker' | 'httpHeaders' | 'withCredentials'
>;

/** Controls how string and `URL` sources are fetched. */
export interface PdfRequestOptions {
  /** Extra `fetch` options (headers, credentials, …) for URL sources. */
  requestInit?: RequestInit | undefined;
  /** Replaces `fetch` entirely, e.g. with an authenticated client. */
  fetcher?: ((url: string, init: RequestInit) => Promise<Response>) | undefined;
  /**
   * Called for non-2xx responses. Return `true` when handled (for example after redirecting to a
   * sign-in page): the viewer then shows its empty state and does not call `onError`.
   */
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- callers may return nothing
  onHttpError?: ((response: Response) => boolean | void | Promise<boolean | void>) | undefined;
  /**
   * Builds the message for an `HTTP_ERROR`. Return `undefined` to use the default, which reads an
   * RFC 7807 body (`detail`, then `title`), then a JSON string body, then
   * `Failed to fetch PDF: {status} {statusText}`.
   */
  getHttpErrorMessage?: ((response: Response) => Promise<string | undefined>) | undefined;
}

/** Toolbar customisation. */
export interface ToolbarConfig {
  /** Toolbar placement. Default `'bottom'` (original behavior). */
  position?: 'bottom' | 'top' | undefined;
  /** Actions to show. Default: all, in the original order. */
  actions?: readonly ToolbarAction[] | undefined;
  /** Actions hidden in compact, non-fullscreen mode. Default `['rotate', 'print']` (original). */
  hiddenWhenCompact?: readonly ToolbarAction[] | undefined;
}

/**
 * Imperative viewer API, available through `ref` and passed to `renderToolbar`. Values are a
 * snapshot of the render that produced the object.
 */
export interface PdfViewerApi {
  readonly status: PdfDocumentStatus;
  /** Page count; `0` without a document. */
  readonly numPages: number;
  /** Current 1-based page, clamped to the document. */
  readonly page: number;
  /** Current scale (1 = 100%). */
  readonly scale: number;
  readonly rotation: Rotation;
  readonly fullscreen: boolean;
  /** Whether `zoomIn()` would change the scale. */
  readonly canZoomIn: boolean;
  /** Whether `zoomOut()` would change the scale. */
  readonly canZoomOut: boolean;
  goToPage(page: number): void;
  nextPage(): void;
  previousPage(): void;
  zoomIn(): void;
  zoomOut(): void;
  /** Sets the scale, clamped to `[minScale, maxScale]`. */
  setScale(scale: number): void;
  /** Returns to `defaultScale`. */
  resetZoom(): void;
  /** Rotates by 90° clockwise (default) or counter-clockwise. */
  rotate(direction?: 'cw' | 'ccw'): void;
  toggleFullscreen(): void;
  /** Saves the loaded document (no second request). */
  download(): Promise<void>;
  /** Prints according to `printMode`. */
  print(): Promise<void>;
  /** Loads the source again. */
  reload(): void;
  /** The loaded PDF.js document, for advanced use. */
  getDocument(): PDFDocumentProxy | null;
}

/** Props for `PdfViewer`. Every piece of state supports the value / defaultValue / onChange trio. */
export interface PdfViewerProps extends PdfRequestOptions {
  /** The document. `null`, `undefined` and `''` show the empty state. */
  source: PdfSource | null | undefined;
  /** Download file name. Default: a `File`'s name, the URL's `.pdf` segment, else `document.pdf`. */
  fileName?: string | undefined;

  /** Controlled 1-based page. */
  page?: number | undefined;
  /** Initial page when uncontrolled, and the page a new document opens on. Default `1`. */
  defaultPage?: number | undefined;
  onPageChange?: ((page: number) => void) | undefined;
  /** Controlled scale (1 = 100%). */
  scale?: number | undefined;
  /** Initial scale when uncontrolled; also the "reset zoom" target. Default `1`. */
  defaultScale?: number | undefined;
  onScaleChange?: ((scale: number) => void) | undefined;
  /** Controlled rotation, relative to each page's natural orientation. */
  rotation?: Rotation | undefined;
  /** Initial rotation when uncontrolled. Default `0`. */
  defaultRotation?: Rotation | undefined;
  onRotationChange?: ((rotation: Rotation) => void) | undefined;
  /** Controlled fullscreen state. */
  fullscreen?: boolean | undefined;
  /** Initial fullscreen state when uncontrolled. Default `false`. */
  defaultFullscreen?: boolean | undefined;
  onFullscreenChange?: ((fullscreen: boolean) => void) | undefined;
  /** Default: `'controlled'` when `fullscreen` is passed (original behavior), else `'native'`. */
  fullscreenMode?: FullscreenMode | undefined;

  /** Zoom floor. Default `0.25`. */
  minScale?: number | undefined;
  /** Zoom ceiling. Default `5`. */
  maxScale?: number | undefined;
  /** Zoom button increment. Default `0.05`. */
  scaleStep?: number | undefined;
  /** Opt-in preset ladder; the zoom buttons step between presets instead of by `scaleStep`. */
  zoomLevels?: readonly number[] | undefined;
  /** At the default scale, shrink the page to the available width (original behavior). Default `true`. */
  fitWidthAtDefaultScale?: boolean | undefined;
  /**
   * Opt-in: at the default scale, scale the page to fill the width (`'width'`) or to fit entirely
   * (`'page'`). Zooming away from the default scale shows the page at true size. Default `'none'`.
   */
  fitMode?: 'none' | 'width' | 'page' | undefined;

  /** Password for encrypted documents. */
  password?: string | undefined;
  /** Per-instance `getDocument` overrides. */
  pdfjsOptions?: PdfJsDocumentOptions | undefined;

  /** `false` hides the toolbar; an object customises it. Default `true`. */
  toolbar?: boolean | ToolbarConfig | undefined;
  /** Viewport width (px) below which the compact layout applies. Default `960`. */
  compactBreakpoint?: number | undefined;
  /** Keyboard shortcuts while focus is inside the viewer. Default `true`. */
  keyboardShortcuts?: boolean | undefined;
  /** `'render'` prints through a hidden iframe; `'open-url'` opens the PDF in a new tab (original). Default `'render'`. */
  printMode?: 'render' | 'open-url' | undefined;
  /** Canvas pixel budget per page. Default `16_777_216`. */
  maxCanvasPixels?: number | undefined;
  /** Label overrides (i18n). */
  labels?: Partial<PdfViewerLabels> | undefined;
  /** Locale for number formatting, e.g. `'hu-HU'`. */
  locale?: string | undefined;

  /** Replaces the loading view. */
  renderLoading?: (() => ReactNode) | undefined;
  /** Replaces the error view (document and page errors). */
  renderError?: ((error: PdfViewerError, actions: { retry: () => void }) => ReactNode) | undefined;
  /** Replaces the toolbar; receives the viewer API. */
  renderToolbar?: ((api: PdfViewerApi) => ReactNode) | undefined;
  /** Replaces the empty view. */
  renderEmpty?: (() => ReactNode) | undefined;

  /** Called when a document is ready. */
  onDocumentLoad?: ((info: { numPages: number; fingerprint: string }) => void) | undefined;
  /** Called after each completed page render. */
  onPageRender?: ((info: PageRenderInfo) => void) | undefined;
  /** Called for every failure except aborts, cancelled renders and handled HTTP errors. */
  onError?: ((error: PdfViewerError) => void) | undefined;
  /** Return `false` to prevent the default download. */
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- callers may return nothing
  onDownload?: ((context: { fileName: string; data: Uint8Array }) => void | false) | undefined;
  /** Return `false` to prevent the default print. */
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- callers may return nothing
  onPrint?: (() => void | false) | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;
  id?: string | undefined;
  /** Accessible name of the viewer. Default `labels.viewer`. */
  'aria-label'?: string | undefined;
}
