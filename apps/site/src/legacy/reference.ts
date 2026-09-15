/**
 * Reference data for the documentation page.
 *
 * Member tables are typed as `Members<T>` over the package's own types, so adding a prop, API
 * member, label or error code to the library without documenting it here fails the demo's type
 * check. CSS variables are checked against the stylesheet by `e2e/docs.spec.ts`.
 */
import {
  defaultLabels,
  type FitOptions,
  type LabelContext,
  type PageHighlight,
  type PageRenderInfo,
  type PdfJsConfig,
  type PdfPageCanvasProps,
  type PdfToolbarProps,
  type PdfViewerApi,
  type PdfViewerError,
  type PdfViewerErrorCode,
  type PdfViewerLabels,
  type PdfViewerProps,
  type ToolbarAction,
  type ToolbarConfig,
  type UseControllableStateOptions,
  type UsePdfDocumentOptions,
  type UsePdfDocumentResult,
} from '@kiralygyula92/react-pdf-viewer';
import type * as Library from '@kiralygyula92/react-pdf-viewer';

/** The package name used in snippets. */
export const PKG = '@kiralygyula92/react-pdf-viewer';

export type Tag = 'required' | 'controlled' | 'opt-in';

/** One documented member: a prop, option, field, method, variable or key binding. */
export interface MemberDoc {
  type?: string;
  default?: string;
  description: string;
  tag?: Tag;
}

/** A rendered table row. */
export interface Row extends MemberDoc {
  name: string;
  /** Marks rows naming a stylesheet custom property (checked by the e2e suite). */
  cssVar?: boolean;
}

/** Documentation for every key of `T`, required even where `T`'s key is optional. */
type Members<T> = { readonly [K in keyof T]-?: MemberDoc };

function rows(members: Readonly<Record<string, MemberDoc>>): Row[] {
  return Object.entries(members).map(([name, doc]) => ({ name, ...doc }));
}

const quote = (text: string) => `'${text}'`;

// ── PdfViewer props ─────────────────────────────────────────────────────────

type ViewerGroup =
  | 'document'
  | 'request'
  | 'state'
  | 'zoom'
  | 'features'
  | 'toolbar'
  | 'output'
  | 'i18n'
  | 'slots'
  | 'events'
  | 'root';

const viewerProps: { readonly [K in keyof PdfViewerProps]-?: MemberDoc & { group: ViewerGroup } } =
  {
    source: {
      group: 'document',
      tag: 'required',
      type: 'PdfSource | null | undefined',
      description:
        "The document: a URL string or `URL`, or `ArrayBuffer` / `Uint8Array` / `Blob` / `File`. `null`, `undefined` and `''` show the empty state.",
    },
    fileName: {
      group: 'document',
      type: 'string',
      default: 'derived',
      description:
        'Download file name. Default: a `File`’s name, the URL’s last `.pdf` segment, else `document.pdf`.',
    },
    password: {
      group: 'document',
      type: 'string',
      description: 'Password for encrypted documents. Changing it reloads the document.',
    },
    pdfjsOptions: {
      group: 'document',
      type: 'PdfJsDocumentOptions',
      description:
        'Per-instance `getDocument` overrides such as `cMapUrl`, `standardFontDataUrl` or `verbosity`. Source-related options are managed by the viewer.',
    },

    requestInit: {
      group: 'request',
      type: 'RequestInit',
      description: 'Extra `fetch` options for URL sources: headers, `credentials`, `mode`, …',
    },
    fetcher: {
      group: 'request',
      type: '(url: string, init: RequestInit) => Promise<Response>',
      description: 'Replaces `fetch` entirely, e.g. with an authenticated HTTP client.',
    },
    onHttpError: {
      group: 'request',
      type: '(response: Response) => boolean | void | Promise<boolean | void>',
      description:
        'Called for non-2xx responses. Return `true` when handled (e.g. after redirecting to sign-in): the viewer shows its empty state and does not call `onError`.',
    },
    getHttpErrorMessage: {
      group: 'request',
      type: '(response: Response) => Promise<string | undefined>',
      description:
        'Builds the `HTTP_ERROR` message. Return `undefined` for the default: an RFC 7807 `detail`, then `title`, then a JSON string body, then `Failed to fetch PDF: {status} {statusText}`.',
    },

    page: {
      group: 'state',
      tag: 'controlled',
      type: 'number',
      description:
        'Controlled 1-based page. Out-of-range values are clamped and reported through `onPageChange`.',
    },
    defaultPage: {
      group: 'state',
      type: 'number',
      default: '1',
      description: 'Initial page while uncontrolled, and the page every new document opens on.',
    },
    onPageChange: {
      group: 'state',
      type: '(page: number) => void',
      description: 'Called whenever the page changes, controlled or not.',
    },
    scale: {
      group: 'state',
      tag: 'controlled',
      type: 'number',
      description: 'Controlled scale: `1` = 100%, one PDF point per CSS pixel.',
    },
    defaultScale: {
      group: 'state',
      type: 'number',
      default: '1',
      description:
        'Initial scale while uncontrolled; also the reset-zoom target and the scale at which fitting applies.',
    },
    onScaleChange: {
      group: 'state',
      type: '(scale: number) => void',
      description: 'Called whenever the scale changes.',
    },
    rotation: {
      group: 'state',
      tag: 'controlled',
      type: '0 | 90 | 180 | 270',
      description: 'Controlled clockwise rotation, added to each page’s intrinsic rotation.',
    },
    defaultRotation: {
      group: 'state',
      type: 'Rotation',
      default: '0',
      description: 'Initial rotation while uncontrolled.',
    },
    onRotationChange: {
      group: 'state',
      type: '(rotation: Rotation) => void',
      description: 'Called whenever the rotation changes.',
    },
    fullscreen: {
      group: 'state',
      tag: 'controlled',
      type: 'boolean',
      description:
        'Controlled fullscreen state. Passing it selects `fullscreenMode="controlled"` unless a mode is set.',
    },
    defaultFullscreen: {
      group: 'state',
      type: 'boolean',
      default: 'false',
      description: 'Initial fullscreen state while uncontrolled.',
    },
    onFullscreenChange: {
      group: 'state',
      type: '(fullscreen: boolean) => void',
      description: 'Called whenever fullscreen is entered or left.',
    },
    fullscreenMode: {
      group: 'state',
      type: "'controlled' | 'native' | 'overlay'",
      default: "'controlled' with fullscreen, else 'native'",
      description:
        '`controlled`: layout only, the parent presents fullscreen (e.g. in its own dialog). `native`: the browser Fullscreen API on the viewer root, falling back to `overlay`. `overlay`: a fixed full-viewport layer with a focus trap; `Esc` closes it.',
    },

    minScale: { group: 'zoom', type: 'number', default: '0.25', description: 'Zoom floor (25%).' },
    maxScale: { group: 'zoom', type: 'number', default: '5', description: 'Zoom ceiling (500%).' },
    scaleStep: {
      group: 'zoom',
      type: 'number',
      default: '0.05',
      description: 'Increment of the zoom buttons and the `+` / `-` keys.',
    },
    zoomLevels: {
      group: 'zoom',
      tag: 'opt-in',
      type: 'readonly number[]',
      description:
        'Preset ladder, e.g. `[0.5, 1, 1.5, 2, 4]`: the zoom buttons step between presets instead of by `scaleStep`.',
    },
    fitWidthAtDefaultScale: {
      group: 'zoom',
      type: 'boolean',
      default: 'true',
      description: 'At the default scale, shrink the page to the available width.',
    },
    fitMode: {
      group: 'zoom',
      tag: 'opt-in',
      type: "'none' | 'width' | 'page'",
      default: "'none'",
      description:
        'At the default scale, fill the width (`width`) or fit the whole page (`page`). Zooming away shows the page at true size.',
    },
    wheelZoom: {
      group: 'zoom',
      tag: 'opt-in',
      type: 'boolean',
      default: 'false',
      description: '`Ctrl` / `⌘` + wheel and trackpad pinch zoom, anchored at the pointer.',
    },
    zoomReset: {
      group: 'zoom',
      tag: 'opt-in',
      type: 'boolean',
      default: 'false',
      description: 'The zoom label becomes a button that resets zoom.',
    },

    layout: {
      group: 'features',
      tag: 'opt-in',
      type: "'single' | 'continuous'",
      default: "'single'",
      description:
        'One page at a time or vertical scrolling through all pages. Only the visible pages ±1 are rendered; the page indicator follows the scroll position.',
    },
    textLayer: {
      group: 'features',
      tag: 'opt-in',
      type: 'boolean',
      default: 'false',
      description: 'Selectable, copyable text that assistive technology can read.',
    },
    annotationLayer: {
      group: 'features',
      tag: 'opt-in',
      type: 'boolean',
      default: 'false',
      description:
        'Clickable links: internal links navigate, external links open in a new tab with `rel="noopener noreferrer"`.',
    },
    search: {
      group: 'features',
      tag: 'opt-in',
      type: 'boolean',
      default: 'false',
      description:
        'Find bar with highlighting (implies `textLayer`). `Ctrl` / `⌘` + `F` focuses it, `Enter` / `Shift` + `Enter` step through matches, `Esc` clears.',
    },
    thumbnails: {
      group: 'features',
      tag: 'opt-in',
      type: 'boolean',
      default: 'false',
      description:
        'Lazily rendered page thumbnails sidebar, hidden in compact, non-fullscreen mode.',
    },
    pageInput: {
      group: 'features',
      tag: 'opt-in',
      type: 'boolean',
      default: 'false',
      description: 'Editable page number in the toolbar.',
    },
    passwordPrompt: {
      group: 'features',
      tag: 'opt-in',
      type: 'boolean',
      default: 'false',
      description:
        'Ask for the password of encrypted documents instead of reporting `PASSWORD_REQUIRED`.',
    },

    toolbar: {
      group: 'toolbar',
      type: 'boolean | ToolbarConfig',
      default: 'true',
      description:
        '`false` hides the toolbar; an object sets `position`, `actions` and `hiddenWhenCompact`.',
    },
    compactBreakpoint: {
      group: 'toolbar',
      type: 'number',
      default: '960',
      description:
        'Viewport width (px) below which the compact layout applies: less padding, and `hiddenWhenCompact` actions hidden outside fullscreen.',
    },
    keyboardShortcuts: {
      group: 'toolbar',
      type: 'boolean',
      default: 'true',
      description: 'Keyboard shortcuts while focus is inside the viewer.',
    },

    printMode: {
      group: 'output',
      type: "'render' | 'open-url'",
      default: "'render'",
      description:
        '`render` prints through a hidden iframe, with progress and Cancel; `open-url` opens the PDF in a new tab.',
    },
    maxCanvasPixels: {
      group: 'output',
      type: 'number',
      default: '16777216',
      description:
        'Canvas pixel budget per page (4096 × 4096). Above it, resolution degrades gracefully instead of failing.',
    },

    labels: {
      group: 'i18n',
      type: 'Partial<PdfViewerLabels>',
      default: 'English',
      description:
        'Overrides for any visible string or accessible name. Keep the object stable (e.g. at module scope).',
    },
    locale: {
      group: 'i18n',
      type: 'string',
      default: 'browser',
      description: 'BCP 47 locale for number formatting, e.g. `hu-HU`.',
    },

    renderLoading: {
      group: 'slots',
      type: '() => ReactNode',
      description: 'Replaces the loading view.',
    },
    renderError: {
      group: 'slots',
      type: '(error: PdfViewerError, actions: { retry: () => void }) => ReactNode',
      description: 'Replaces the document and page error views.',
    },
    renderToolbar: {
      group: 'slots',
      type: '(api: PdfViewerApi) => ReactNode',
      description: 'Replaces the toolbar. Render `<PdfToolbar api={api} />` inside to reuse parts.',
    },
    renderEmpty: {
      group: 'slots',
      type: '() => ReactNode',
      description: 'Replaces the view shown without a source.',
    },
    renderPasswordPrompt: {
      group: 'slots',
      type: '(context: { incorrect: boolean; submit: (password: string) => void }) => ReactNode',
      description: 'Replaces the built-in password form (with `passwordPrompt`).',
    },

    onDocumentLoad: {
      group: 'events',
      type: '(info: { numPages: number; fingerprint: string }) => void',
      description: 'A document finished loading.',
    },
    onPageRender: {
      group: 'events',
      type: '(info: PageRenderInfo) => void',
      description: 'A page render completed.',
    },
    onError: {
      group: 'events',
      type: '(error: PdfViewerError) => void',
      description:
        'Every failure except aborted loads, cancelled renders and HTTP errors handled by `onHttpError`.',
    },
    onDownload: {
      group: 'events',
      type: '(context: { fileName: string; data: Uint8Array }) => void | false',
      description:
        'Before saving; `data` holds the already-loaded bytes. Return `false` to handle the download yourself.',
    },
    onPrint: {
      group: 'events',
      type: '() => void | false',
      description: 'Before printing. Return `false` to handle printing yourself.',
    },

    className: {
      group: 'root',
      type: 'string',
      description:
        'Added to the root (`.rpv-root`). `rpv-theme-dark` and `rpv-theme-auto` select the dark presets.',
    },
    style: {
      group: 'root',
      type: 'CSSProperties',
      description: 'Inline styles on the root, e.g. CSS variables.',
    },
    id: { group: 'root', type: 'string', description: 'Id of the root element.' },
    'aria-label': {
      group: 'root',
      type: 'string',
      default: 'labels.viewer',
      description: 'Accessible name of the viewer region.',
    },
  };

function viewerRows(group: ViewerGroup): Row[] {
  return rows(viewerProps).filter(
    (row) => viewerProps[row.name as keyof PdfViewerProps].group === group,
  );
}

// ── Other public types ──────────────────────────────────────────────────────

const toolbarConfig: Members<ToolbarConfig> = {
  position: {
    type: "'bottom' | 'top'",
    default: "'bottom'",
    description: 'Toolbar placement (below the page by default).',
  },
  actions: {
    type: 'readonly ToolbarAction[]',
    default: 'all, in order',
    description: 'Actions to show. Their order within each group is fixed.',
  },
  hiddenWhenCompact: {
    type: 'readonly ToolbarAction[]',
    default: "['rotate', 'print']",
    description: 'Actions hidden in compact, non-fullscreen mode.',
  },
};

const toolbarActions: { readonly [K in ToolbarAction]: MemberDoc } = {
  zoomOut: { description: 'Zoom out button. Zoom group.' },
  zoomLevel: { description: 'Zoom percentage; a reset button with `zoomReset`. Zoom group.' },
  zoomIn: { description: 'Zoom in button. Zoom group.' },
  previousPage: { description: 'Previous page button. Page group.' },
  pageIndicator: { description: 'Current page and total; an input with `pageInput`. Page group.' },
  nextPage: { description: 'Next page button. Page group.' },
  fullscreen: { description: 'Enter / exit fullscreen. Actions group.' },
  rotate: { description: 'Rotate 90° clockwise. Actions group.' },
  download: { description: 'Save the loaded document. Actions group.' },
  print: { description: 'Print according to `printMode`. Actions group.' },
};

const api: Members<PdfViewerApi> = {
  status: {
    type: "'idle' | 'loading' | 'ready' | 'error'",
    description: 'Document status.',
  },
  numPages: { type: 'number', description: 'Page count; `0` without a document.' },
  page: { type: 'number', description: 'Current 1-based page, clamped to the document.' },
  scale: { type: 'number', description: 'Current scale (`1` = 100%).' },
  rotation: { type: 'Rotation', description: 'Current user rotation.' },
  fullscreen: { type: 'boolean', description: 'Whether the viewer is in fullscreen.' },
  canZoomIn: { type: 'boolean', description: 'Whether `zoomIn()` would change the scale.' },
  canZoomOut: { type: 'boolean', description: 'Whether `zoomOut()` would change the scale.' },
  goToPage: { type: '(page: number) => void', description: 'Go to a page (clamped).' },
  nextPage: { type: '() => void', description: 'Next page.' },
  previousPage: { type: '() => void', description: 'Previous page.' },
  zoomIn: { type: '() => void', description: 'One step (or preset) up.' },
  zoomOut: { type: '() => void', description: 'One step (or preset) down.' },
  setScale: {
    type: '(scale: number) => void',
    description: 'Set the scale, clamped to `[minScale, maxScale]`.',
  },
  resetZoom: { type: '() => void', description: 'Return to `defaultScale`.' },
  rotate: {
    type: "(direction?: 'cw' | 'ccw') => void",
    description: 'Rotate by 90°, clockwise by default.',
  },
  toggleFullscreen: { type: '() => void', description: 'Enter or leave fullscreen.' },
  download: {
    type: '() => Promise<void>',
    description: 'Save the loaded document (no second request).',
  },
  print: { type: '() => Promise<void>', description: 'Print according to `printMode`.' },
  reload: { type: '() => void', description: 'Load the source again, e.g. after an error.' },
  getDocument: {
    type: '() => PDFDocumentProxy | null',
    description: 'The loaded PDF.js document, for advanced use. Do not destroy it.',
  },
};

const errorFields: Members<PdfViewerError> = {
  code: { type: 'PdfViewerErrorCode', description: 'Machine-readable category.' },
  message: {
    type: 'string',
    description: 'Human-readable message; for `HTTP_ERROR` it comes from `getHttpErrorMessage`.',
  },
  status: { type: 'number', description: 'The HTTP status, for `HTTP_ERROR`.' },
  cause: { type: 'unknown', description: 'The underlying error, when there is one.' },
};

const errorCodes: { readonly [K in PdfViewerErrorCode]: MemberDoc } = {
  PDFJS_LOAD_FAILED: { description: 'The `pdfjs-dist` module or its worker failed to load.' },
  NETWORK_ERROR: { description: '`fetch` rejected: offline, CORS, DNS, …' },
  HTTP_ERROR: { description: 'The server answered with a non-2xx status (`status` is set).' },
  INVALID_PDF: { description: 'The bytes are not a valid PDF.' },
  PASSWORD_REQUIRED: { description: 'The document is encrypted and no password was supplied.' },
  INCORRECT_PASSWORD: { description: 'The supplied password is wrong.' },
  RENDER_FAILED: { description: 'A page failed to render.' },
  DOWNLOAD_FAILED: { description: 'Saving the document failed.' },
  PRINT_FAILED: { description: 'Printing failed.' },
  UNKNOWN: { description: 'Anything else.' },
};

const sample: LabelContext = { formatNumber: (value) => String(value) };

const labels: Members<PdfViewerLabels> = {
  viewer: {
    type: 'string',
    default: quote(defaultLabels.viewer),
    description: 'Accessible name of the viewer region.',
  },
  toolbar: {
    type: 'string',
    default: quote(defaultLabels.toolbar),
    description: 'Accessible name of the toolbar.',
  },
  document: {
    type: 'string',
    default: quote(defaultLabels.document),
    description: 'Accessible name of the scrollable document area.',
  },
  zoomOut: { type: 'string', default: quote(defaultLabels.zoomOut), description: 'Button.' },
  zoomIn: { type: 'string', default: quote(defaultLabels.zoomIn), description: 'Button.' },
  zoomLevel: {
    type: '(percent, context) => string',
    default: `(100) → ${quote(defaultLabels.zoomLevel(100, sample))}`,
    description: 'Zoom label text.',
  },
  resetZoom: {
    type: 'string',
    default: quote(defaultLabels.resetZoom),
    description: 'Reset-zoom button (with `zoomReset`) and menu item.',
  },
  previousPage: {
    type: 'string',
    default: quote(defaultLabels.previousPage),
    description: 'Button.',
  },
  nextPage: { type: 'string', default: quote(defaultLabels.nextPage), description: 'Button.' },
  pageIndicator: {
    type: '(page, total, context) => string',
    default: `(1, 3) → ${quote(defaultLabels.pageIndicator(1, 3, sample))}`,
    description: 'Page label text.',
  },
  pageAriaLabel: {
    type: '(page, total, context) => string',
    default: `(1, 3) → ${quote(defaultLabels.pageAriaLabel(1, 3, sample))}`,
    description: 'Accessible name of each page.',
  },
  pageInput: {
    type: 'string',
    default: quote(defaultLabels.pageInput),
    description: 'Accessible name of the page-number input.',
  },
  enterFullscreen: {
    type: 'string',
    default: quote(defaultLabels.enterFullscreen),
    description: 'Fullscreen button outside fullscreen.',
  },
  exitFullscreen: {
    type: 'string',
    default: quote(defaultLabels.exitFullscreen),
    description: 'Fullscreen button in fullscreen.',
  },
  rotate: { type: 'string', default: quote(defaultLabels.rotate), description: 'Button.' },
  download: { type: 'string', default: quote(defaultLabels.download), description: 'Button.' },
  print: { type: 'string', default: quote(defaultLabels.print), description: 'Button.' },
  moreActions: {
    type: 'string',
    default: quote(defaultLabels.moreActions),
    description: 'Overflow menu button shown when the toolbar is too narrow.',
  },
  loading: {
    type: 'string',
    default: quote(defaultLabels.loading),
    description: 'Loading view text.',
  },
  retry: {
    type: 'string',
    default: quote(defaultLabels.retry),
    description: 'Retry button of the error view.',
  },
  empty: {
    type: 'string',
    default: quote(defaultLabels.empty),
    description: 'Announced when there is no document.',
  },
  printProgress: {
    type: '(done, total, context) => string',
    default: `(3, 40) → ${quote(defaultLabels.printProgress(3, 40, sample))}`,
    description: 'Print preparation status.',
  },
  cancel: {
    type: 'string',
    default: quote(defaultLabels.cancel),
    description: 'Cancels print preparation.',
  },
  passwordPrompt: {
    type: 'string',
    default: quote(defaultLabels.passwordPrompt),
    description: 'Password form heading.',
  },
  passwordLabel: {
    type: 'string',
    default: quote(defaultLabels.passwordLabel),
    description: 'Password field label.',
  },
  passwordSubmit: {
    type: 'string',
    default: quote(defaultLabels.passwordSubmit),
    description: 'Password submit button.',
  },
  passwordIncorrect: {
    type: 'string',
    default: quote(defaultLabels.passwordIncorrect),
    description: 'Shown after a wrong password.',
  },
  thumbnails: {
    type: 'string',
    default: quote(defaultLabels.thumbnails),
    description: 'Accessible name of the thumbnails sidebar.',
  },
  search: {
    type: 'string',
    default: quote(defaultLabels.search),
    description: 'Accessible name of the search field.',
  },
  searchResults: {
    type: '(current, total, context) => string',
    default: `(2, 5) → ${quote(defaultLabels.searchResults(2, 5, sample))}`,
    description: 'Search result status.',
  },
  searchPrevious: {
    type: 'string',
    default: quote(defaultLabels.searchPrevious),
    description: 'Search button.',
  },
  searchNext: {
    type: 'string',
    default: quote(defaultLabels.searchNext),
    description: 'Search button.',
  },
  searchNoResults: {
    type: 'string',
    default: quote(defaultLabels.searchNoResults),
    description: 'Shown when nothing matches.',
  },
};

const pdfJsConfig: Members<PdfJsConfig> = {
  loader: {
    type: '() => Promise<PdfJsModule>',
    default: "() => import('pdfjs-dist')",
    description:
      "Returns the `pdfjs-dist` module, e.g. `() => import('pdfjs-dist/legacy/build/pdf.mjs')` for older browsers.",
  },
  workerSrc: {
    type: 'string',
    default: 'jsDelivr',
    description:
      'Worker script URL. A worker you set on `GlobalWorkerOptions` yourself is respected.',
  },
  workerPort: {
    type: 'Worker',
    description: 'A ready `Worker` running the PDF.js worker; takes precedence over `workerSrc`.',
  },
  cMapUrl: {
    type: 'string',
    default: 'jsDelivr cmaps/',
    description: 'CMap files, trailing slash.',
  },
  cMapPacked: { type: 'boolean', default: 'true', description: 'Whether the CMaps are packed.' },
  standardFontDataUrl: {
    type: 'string',
    default: 'jsDelivr standard_fonts/',
    description: 'Standard font data, trailing slash.',
  },
  wasmUrl: {
    type: 'string',
    default: 'jsDelivr wasm/',
    description: 'WebAssembly image decoders, trailing slash.',
  },
  iccUrl: {
    type: 'string',
    default: 'jsDelivr iccs/',
    description: 'ICC color profiles, trailing slash.',
  },
  isEvalSupported: {
    type: 'boolean',
    default: 'false',
    description: 'Forwarded to `getDocument`; kept `false` as defense in depth (CVE-2024-4367).',
  },
};

const pageCanvas: Members<PdfPageCanvasProps> = {
  document: {
    tag: 'required',
    type: 'PDFDocumentProxy',
    description: 'A loaded document, e.g. from `usePdfDocument`.',
  },
  page: { tag: 'required', type: 'number', description: '1-based page; clamped to the document.' },
  scale: { type: 'number', default: '1', description: 'Scale, `1` = 100%.' },
  rotation: {
    type: 'Rotation',
    default: '0',
    description: 'Added to the page’s intrinsic rotation.',
  },
  fit: { type: 'FitOptions', description: 'A box the page must fit into.' },
  maxCanvasPixels: { type: 'number', default: '16777216', description: 'Canvas pixel budget.' },
  textLayer: { type: 'boolean', default: 'false', description: 'Selectable text layer.' },
  annotationLayer: { type: 'boolean', default: 'false', description: 'Clickable links.' },
  highlight: {
    type: 'PageHighlight',
    description: 'Search matches to highlight (requires `textLayer`).',
  },
  onLinkNavigate: {
    type: '(page: number) => void',
    description: 'An internal link targets another page.',
  },
  onHighlight: {
    type: '(element: HTMLElement) => void',
    description: 'Receives the selected match’s element, e.g. to scroll it into view.',
  },
  'aria-label': {
    type: 'string',
    description:
      'Accessible name, e.g. `Page 1 of 3`. With a name the page is an image (a group with `textLayer`); without one it is decorative.',
  },
  className: { type: 'string', description: 'Added to the page element.' },
  style: { type: 'CSSProperties', description: 'Inline styles on the page element.' },
  renderError: {
    type: '(error, { retry }) => ReactNode',
    description: 'Replaces the in-place error view.',
  },
  onRender: { type: '(info: PageRenderInfo) => void', description: 'After each completed render.' },
  onError: {
    type: '(error: PdfViewerError) => void',
    description: 'Rendering failed (cancellations are not failures).',
  },
};

const toolbarProps: Members<PdfToolbarProps> = {
  api: {
    tag: 'required',
    type: 'PdfViewerApi',
    description: 'The viewer API, from a `ref` or `renderToolbar`.',
  },
  labels: { type: 'Partial<PdfViewerLabels>', description: 'Label overrides.' },
  config: { type: 'ToolbarConfig', description: 'Which actions to show.' },
  compact: {
    type: 'boolean',
    default: 'false',
    description: 'Compact layout: hides `hiddenWhenCompact` actions outside fullscreen.',
  },
  locale: { type: 'string', description: 'Locale for number formatting.' },
  zoomReset: {
    type: 'boolean',
    default: 'false',
    description: 'The zoom label becomes a reset button.',
  },
  pageIndicator: {
    type: 'ReactNode',
    description: 'Replaces the page indicator text, e.g. with your own input.',
  },
  menuPlacement: {
    type: "'top' | 'bottom'",
    default: "'top'",
    description:
      'Where the More actions menu opens. `PdfViewer` picks the side away from the edge.',
  },
};

const usePdfDocumentOptions: Members<UsePdfDocumentOptions> = {
  password: {
    type: 'string',
    description: 'Password for encrypted documents. Changing it reloads the document.',
  },
  pdfjsOptions: {
    type: 'PdfJsDocumentOptions',
    description: 'Per-instance `getDocument` overrides.',
  },
  onLoad: { type: '(document: PDFDocumentProxy) => void', description: 'The document is ready.' },
  onError: {
    type: '(error: PdfViewerError) => void',
    description: 'Every load failure except aborts and handled HTTP errors.',
  },
  requestInit: { type: 'RequestInit', description: 'As on `PdfViewer`.' },
  fetcher: { type: '(url, init) => Promise<Response>', description: 'As on `PdfViewer`.' },
  onHttpError: {
    type: '(response) => boolean | void | Promise<…>',
    description: 'As on `PdfViewer`.',
  },
  getHttpErrorMessage: {
    type: '(response) => Promise<string | undefined>',
    description: 'As on `PdfViewer`.',
  },
};

const usePdfDocumentResult: Members<UsePdfDocumentResult> = {
  status: {
    type: "'idle' | 'loading' | 'ready' | 'error'",
    description: '`idle` without a source (or after a handled HTTP error).',
  },
  document: {
    type: 'PDFDocumentProxy | null',
    description: 'The document while `ready`. Never a destroyed document.',
  },
  numPages: { type: 'number', description: 'Page count; `0` without a document.' },
  error: { type: 'PdfViewerError | null', description: 'The failure while `error`.' },
  reload: { type: '() => void', description: 'Load the current source again.' },
};

const controllable: Members<UseControllableStateOptions<unknown>> = {
  value: {
    type: 'T | undefined',
    description: 'The controlled value; `undefined` = uncontrolled.',
  },
  defaultValue: {
    tag: 'required',
    type: 'T | (() => T)',
    description: 'Initial value while uncontrolled.',
  },
  onChange: {
    type: '(value: T) => void',
    description: 'Called with every change, controlled or not.',
  },
  name: {
    type: 'string',
    default: "'value'",
    description: 'Prop name used in development warnings.',
  },
};

const fitOptions: Members<FitOptions> = {
  width: {
    type: 'number',
    description: 'Available width in CSS pixels, including border and padding.',
  },
  height: {
    type: 'number',
    description: 'Available height in CSS pixels, including border and padding.',
  },
  upscale: {
    type: 'boolean',
    default: 'false',
    description: 'Scale up to fill the box; otherwise the page only ever shrinks.',
  },
};

const pageHighlight: Members<PageHighlight> = {
  query: { tag: 'required', type: 'string', description: 'Text to highlight, case-insensitive.' },
  selected: {
    tag: 'required',
    type: 'number | null',
    description: 'Index of the page’s match to mark as selected.',
  },
};

const pageRenderInfo: Members<PageRenderInfo> = {
  page: { type: 'number', description: 'The page rendered (after clamping).' },
  scale: { type: 'number', description: 'The scale actually rendered (after fitting).' },
  width: { type: 'number', description: 'Rendered CSS width in pixels.' },
  height: { type: 'number', description: 'Rendered CSS height in pixels.' },
  durationMs: { type: 'number', description: 'Time from request to completion.' },
};

const valueExports: { readonly [K in keyof typeof Library]: MemberDoc } = {
  PdfViewer: { type: 'component', description: 'The viewer. Accepts a `ref` to `PdfViewerApi`.' },
  PdfToolbar: { type: 'component', description: 'The default toolbar, for `renderToolbar`.' },
  PdfPageCanvas: { type: 'component', description: 'Renders one page of a loaded document.' },
  usePdfDocument: { type: 'hook', description: 'Loads a document from a `PdfSource`.' },
  useControllableState: { type: 'hook', description: 'The controlled / uncontrolled state hook.' },
  configurePdfJs: {
    type: 'function',
    description: 'Global PDF.js worker, asset and loader setup.',
  },
  defaultLabels: { type: 'constant', description: 'The English `PdfViewerLabels`.' },
};

const typeExports: Record<string, string> = {
  PdfViewerProps: 'Props of `PdfViewer`.',
  PdfViewerApi: 'The imperative API.',
  PdfSource: '`string | URL | ArrayBuffer | Uint8Array | Blob`.',
  Rotation: '`0 | 90 | 180 | 270`.',
  FullscreenMode: "`'controlled' | 'native' | 'overlay'`.",
  PdfDocumentStatus: "`'idle' | 'loading' | 'ready' | 'error'`.",
  ToolbarAction: 'A toolbar control id.',
  ToolbarConfig: 'The `toolbar` prop object.',
  PdfViewerError: 'A typed error.',
  PdfViewerErrorCode: 'An error category.',
  PdfRequestOptions: 'The four request props, shared with `usePdfDocument`.',
  PdfJsDocumentOptions: 'The `pdfjsOptions` prop.',
  PdfJsConfig: 'Options of `configurePdfJs`.',
  PdfJsModule: 'The `pdfjs-dist` module namespace.',
  PdfViewerLabels: 'All labels.',
  LabelContext: 'The `{ formatNumber }` helper passed to label functions.',
  PdfToolbarProps: 'Props of `PdfToolbar`.',
  PdfPageCanvasProps: 'Props of `PdfPageCanvas`.',
  FitOptions: 'The `fit` prop of `PdfPageCanvas`.',
  PageHighlight: 'The `highlight` prop of `PdfPageCanvas`.',
  PageRenderInfo: 'Passed to `onPageRender` / `onRender`.',
  UsePdfDocumentOptions: 'Options of `usePdfDocument`.',
  UsePdfDocumentResult: 'Result of `usePdfDocument`.',
  UseControllableStateOptions: 'Options of `useControllableState`.',
  SetControllableState: 'The setter returned by `useControllableState`.',
};

// ── CSS ─────────────────────────────────────────────────────────────────────

type CssVar = [name: `--rpv-${string}`, defaultValue: string, description: string];

function cssRows(vars: readonly CssVar[]): Row[] {
  return vars.map(([name, value, description]) => ({
    name,
    default: value,
    description,
    cssVar: true,
  }));
}

const cssToolbar: CssVar[] = [
  ['--rpv-toolbar-bg', '#54646E', 'Toolbar background.'],
  ['--rpv-toolbar-fg', '#FFFFFF', 'Toolbar icons and text.'],
  ['--rpv-toolbar-radius', '8px', 'Corner radius.'],
  ['--rpv-toolbar-min-height', '48px', 'Minimum height.'],
  ['--rpv-toolbar-padding-x', '16px', 'Horizontal padding.'],
  ['--rpv-toolbar-gap', '8px', 'Space between controls within a group.'],
  [
    '--rpv-toolbar-group-gap',
    '16px',
    'Space between the zoom, page and action groups when `pageInput` or `zoomReset` is on.',
  ],
  ['--rpv-toolbar-max-width', '482px (fullscreen 100%)', 'Width cap.'],
  ['--rpv-toolbar-margin-bottom', '40px', 'Space below the toolbar.'],
  ['--rpv-button-size', '34px', 'Icon button size.'],
  ['--rpv-icon-size', '24px', 'Icon size.'],
  ['--rpv-button-hover-bg', 'rgba(255, 255, 255, 0.1)', 'Button hover background.'],
  ['--rpv-button-disabled-fg', 'rgba(255, 255, 255, 0.3)', 'Disabled button color.'],
  ['--rpv-focus-ring', '2px solid #FFFFFF', 'Focus outline of toolbar controls.'],
  ['--rpv-focus-ring-offset', '2px', 'Focus outline offset.'],
  ['--rpv-label-font-size', '14px', 'Zoom and page labels.'],
  ['--rpv-label-font-weight', '600', 'Zoom and page labels.'],
  ['--rpv-page-input-bg', 'rgb(0 0 0 / 0.22)', 'Page-number input fill (`pageInput`).'],
  ['--rpv-page-input-border', 'rgb(255 255 255 / 0.35)', 'Page-number input border color.'],
  [
    '--rpv-page-input-chars',
    'digits of the page count',
    'Width of the page-number input in characters; set automatically.',
  ],
];

const cssMenu: CssVar[] = [
  ['--rpv-menu-bg', '#FFFFFF', 'Menu surface.'],
  ['--rpv-menu-fg', '#1F2A30', 'Menu item text.'],
  ['--rpv-menu-icon-fg', '#54646E', 'Menu item icons.'],
  ['--rpv-menu-hover-bg', 'rgb(84 100 110 / 0.12)', 'Hovered and focused item.'],
  ['--rpv-menu-border', 'rgb(0 0 0 / 0.08)', 'Menu border color.'],
  [
    '--rpv-menu-shadow',
    '0 10px 28px rgb(15 23 42 / 0.18), 0 2px 6px rgb(15 23 42 / 0.12)',
    'Menu elevation.',
  ],
];

const cssLayout: CssVar[] = [
  ['--rpv-font-family', 'inherit', 'Font of all viewer text.'],
  ['--rpv-viewport-max-width', '650px (compact and fullscreen 100%)', 'Document area width cap.'],
  ['--rpv-viewport-max-height', '800px (compact and fullscreen 100%)', 'Document area height cap.'],
  ['--rpv-viewport-min-height', '712px', 'Document area minimum height.'],
  ['--rpv-viewport-min-height-compact', '400px', 'Minimum height in compact mode.'],
  ['--rpv-viewport-padding', '0', 'Document area padding.'],
  ['--rpv-viewport-padding-compact', '16px', 'Padding in compact mode.'],
  ['--rpv-viewport-padding-fullscreen', '32px', 'Padding in fullscreen.'],
  ['--rpv-viewport-margin-bottom', '64px', 'Space between the document and the toolbar.'],
  ['--rpv-fullscreen-bg', '#FFFFFF', 'Fullscreen background.'],
  ['--rpv-overlay-z-index', '1300', 'Stacking order of `overlay` fullscreen.'],
];

const cssPage: CssVar[] = [
  ['--rpv-page-bg', '#FFFFFF', 'Page background (and thumbnail placeholders).'],
  ['--rpv-page-border', '1px solid #DDDDDD', 'Page border.'],
  ['--rpv-page-radius', '4px', 'Page corner radius.'],
  ['--rpv-page-shadow', '0 2px 8px rgba(0, 0, 0, 0.1)', 'Page shadow.'],
  ['--rpv-page-gap', '16px', 'Space between pages (`layout="continuous"`).'],
  ['--rpv-thumbnails-width', '148px', 'Thumbnails sidebar width.'],
  ['--rpv-selection-bg', 'rgb(0 0 255 / 0.25)', 'Text selection (`textLayer`).'],
];

const cssSearch: CssVar[] = [
  ['--rpv-search-bg', '#FFFFFF', 'Search bar background.'],
  ['--rpv-search-fg', '#37474F', 'Search bar text.'],
  ['--rpv-search-highlight', 'rgb(255 213 0 / 0.5)', 'Search matches.'],
  ['--rpv-search-highlight-selected', 'rgb(255 111 0 / 0.6)', 'The current match.'],
];

const cssStatus: CssVar[] = [
  [
    '--rpv-accent',
    '#1976D2',
    'Accent: focus outlines outside the toolbar, progress, the current thumbnail.',
  ],
  ['--rpv-muted-fg', 'rgba(0, 0, 0, 0.6)', 'Secondary text.'],
  ['--rpv-text-button-fg', '#1565C0', 'Retry and Cancel text buttons.'],
  ['--rpv-error-bg', '#FDEDED', 'Error view background.'],
  ['--rpv-error-fg', '#5F2120', 'Error view text.'],
  ['--rpv-error-icon', '#D32F2F', 'Error view icon.'],
];

const darkPreset: [name: string, value: string][] = [
  ['--rpv-toolbar-bg', '#263238'],
  ['--rpv-toolbar-fg', '#ECEFF1'],
  ['--rpv-focus-ring', '2px solid #90CAF9'],
  ['--rpv-page-border', '1px solid #37474F'],
  ['--rpv-page-shadow', '0 2px 12px rgba(0, 0, 0, 0.6)'],
  ['--rpv-accent', '#90CAF9'],
  ['--rpv-text-button-fg', '#90CAF9'],
  ['--rpv-muted-fg', 'rgba(255, 255, 255, 0.7)'],
  ['--rpv-error-bg', '#160B0B'],
  ['--rpv-error-fg', '#F4C7C7'],
  ['--rpv-error-icon', '#F44336'],
  ['--rpv-fullscreen-bg', '#121212'],
  ['--rpv-menu-bg', '#2B363C'],
  ['--rpv-menu-fg', '#ECEFF1'],
  ['--rpv-search-bg', '#1E272C'],
  ['--rpv-search-fg', '#ECEFF1'],
];

const dataAttributes: Record<string, MemberDoc> = {
  'data-status': {
    type: "'idle' | 'loading' | 'ready' | 'error'",
    description: 'Document status.',
  },
  'data-layout': { type: "'single' | 'continuous'", description: 'The `layout` prop.' },
  'data-compact': {
    type: 'present',
    description: 'The viewport is narrower than `compactBreakpoint`.',
  },
  'data-fullscreen': { type: 'present', description: 'In fullscreen, in any mode.' },
  'data-presentation': {
    type: "'layout' | 'native' | 'overlay'",
    description: 'How fullscreen is presented; `layout` in controlled mode.',
  },
  'data-zoomed': { type: 'present', description: 'The scale is above `defaultScale`.' },
};

// ── Keyboard ────────────────────────────────────────────────────────────────

const keyboard: Record<string, MemberDoc> = {
  '← / PageUp': { description: 'Previous page. Arrows scroll a zoomed page horizontally first.' },
  '→ / PageDown': { description: 'Next page.' },
  'Home / End': { description: 'First / last page.' },
  '+ or =': { description: 'Zoom in.' },
  '- or _': { description: 'Zoom out.' },
  '0': { description: 'Reset zoom.' },
  r: { description: 'Rotate clockwise.' },
  'Shift + R': { description: 'Rotate counter-clockwise.' },
  f: { description: 'Toggle fullscreen.' },
  'Ctrl / ⌘ + F': { description: 'Focus the search field (with `search`).' },
  Esc: { description: 'Leave `overlay` fullscreen; clear the search field.' },
};

const toolbarKeys: Record<string, MemberDoc> = {
  Tab: { description: 'Enters and leaves the toolbar: it is a single tab stop.' },
  '← / →': { description: 'Previous / next toolbar control.' },
  'Home / End': { description: 'First / last toolbar control.' },
  'Enter / Space / ↓ on ⋮': { description: 'Open the More actions menu on its first item.' },
  '↑ on ⋮': { description: 'Open the menu on its last item.' },
  '↑ / ↓ in the menu': { description: 'Previous / next item (wrapping).' },
  'Esc in the menu': { description: 'Close the menu and return focus to ⋮.' },
};

// ── Tables ──────────────────────────────────────────────────────────────────

/** Keeps the literal table ids while typing every table as `Row[]`. */
function defineTables<K extends string>(
  tables: Record<K, readonly Row[]>,
): Record<K, readonly Row[]> {
  return tables;
}

export const TABLES = defineTables({
  entryPoints: [
    {
      name: PKG,
      description:
        '`PdfViewer`, `PdfToolbar`, `PdfPageCanvas`, `usePdfDocument`, `useControllableState`, `configurePdfJs`, `defaultLabels` and all types.',
    },
    { name: `${PKG}/styles.css`, description: 'The stylesheet. Import it once.' },
  ],
  pdfjsConfig: rows(pdfJsConfig),
  'props.document': viewerRows('document'),
  'props.request': viewerRows('request'),
  'props.state': viewerRows('state'),
  'props.zoom': viewerRows('zoom'),
  'props.features': viewerRows('features'),
  'props.toolbar': viewerRows('toolbar'),
  'props.output': viewerRows('output'),
  'props.i18n': viewerRows('i18n'),
  'props.slots': viewerRows('slots'),
  'props.events': viewerRows('events'),
  'props.root': viewerRows('root'),
  toolbarConfig: rows(toolbarConfig),
  toolbarActions: rows(toolbarActions),
  api: rows(api),
  errorFields: rows(errorFields),
  errorCodes: rows(errorCodes),
  labels: rows(labels),
  'css.toolbar': cssRows(cssToolbar),
  'css.menu': cssRows(cssMenu),
  'css.layout': cssRows(cssLayout),
  'css.page': cssRows(cssPage),
  'css.search': cssRows(cssSearch),
  'css.status': cssRows(cssStatus),
  darkPreset: darkPreset.map(([name, value]) => ({ name, default: value, description: '' })),
  dataAttributes: rows(dataAttributes),
  keyboard: rows(keyboard),
  toolbarKeys: rows(toolbarKeys),
  'headless.usePdfDocument': rows(usePdfDocumentOptions),
  'headless.usePdfDocumentResult': rows(usePdfDocumentResult),
  'headless.pageCanvas': rows(pageCanvas),
  'headless.toolbar': rows(toolbarProps),
  'headless.fit': rows(fitOptions),
  'headless.highlight': rows(pageHighlight),
  'headless.renderInfo': rows(pageRenderInfo),
  'headless.controllable': rows(controllable),
  exports: [
    ...rows(valueExports),
    ...Object.entries(typeExports).map(([name, description]) => ({
      name,
      type: 'type',
      description,
    })),
  ],
});

export type TableId = keyof typeof TABLES;

interface TableSpec {
  id: TableId;
  title: string;
  intro?: string;
  nameHeader?: string;
}

export const VIEWER_PROP_GROUPS: readonly TableSpec[] = [
  { id: 'props.document', title: 'Document' },
  {
    id: 'props.request',
    title: 'Fetching URL sources',
    intro: 'Applied when `source` is a URL string or `URL`.',
  },
  { id: 'props.state', title: 'State' },
  { id: 'props.zoom', title: 'Zoom and fit' },
  { id: 'props.features', title: 'Features' },
  { id: 'props.toolbar', title: 'Toolbar and keyboard' },
  { id: 'props.output', title: 'Rendering and printing' },
  { id: 'props.i18n', title: 'Localisation' },
  { id: 'props.slots', title: 'Render slots' },
  { id: 'props.events', title: 'Events' },
  { id: 'props.root', title: 'Root element' },
];

export const CSS_VAR_GROUPS: readonly TableSpec[] = [
  { id: 'css.toolbar', title: 'Toolbar' },
  { id: 'css.menu', title: 'More actions menu' },
  { id: 'css.layout', title: 'Layout' },
  { id: 'css.page', title: 'Pages' },
  { id: 'css.search', title: 'Search' },
  { id: 'css.status', title: 'Accent, text and errors' },
];

export const HEADLESS_TABLES: readonly TableSpec[] = [
  {
    id: 'headless.usePdfDocument',
    title: 'usePdfDocument(source, options?)',
    intro: 'Changes apply on the next load, except `password`, which reloads.',
    nameHeader: 'Option',
  },
  { id: 'headless.usePdfDocumentResult', title: 'usePdfDocument result', nameHeader: 'Field' },
  { id: 'headless.pageCanvas', title: 'PdfPageCanvas', nameHeader: 'Prop' },
  {
    id: 'headless.toolbar',
    title: 'PdfToolbar',
    intro: 'The default toolbar, usable anywhere you have a `PdfViewerApi`.',
    nameHeader: 'Prop',
  },
  { id: 'headless.fit', title: 'FitOptions', nameHeader: 'Field' },
  { id: 'headless.highlight', title: 'PageHighlight', nameHeader: 'Field' },
  {
    id: 'headless.renderInfo',
    title: 'PageRenderInfo',
    intro: 'Passed to `onPageRender` and to `PdfPageCanvas` `onRender`.',
    nameHeader: 'Field',
  },
  {
    id: 'headless.controllable',
    title: 'useControllableState(options)',
    intro:
      'The controlled / uncontrolled hook the viewer uses. Returns `[value, setValue]`; the setter is stable and accepts a value or an updater.',
    nameHeader: 'Option',
  },
];
