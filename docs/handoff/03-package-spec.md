# 03 — Package Specification

Target: a professional, publishable React PDF viewer library built on `pdfjs-dist`. It reproduces the original component (01), fixes its defects (02), and is designed for reuse by any React app.

---

## 1. Package identity

| Item | Decision |
|------|----------|
| Working name | `react-pdf-viewer` |
| Publish name | **To be chosen by the owner.** The unscoped `react-pdf-viewer` and the `@react-pdf-viewer/*` family belong to an existing, popular project, so publishing under them would collide or confuse. Recommended: a scoped name you control, e.g. `@<your-scope>/react-pdf-viewer`. Check availability with `npm view <name>` before deciding. |
| Placeholder in code/docs | `@your-scope/react-pdf-viewer`. Keep it in one place (`package.json` + README) so renaming is trivial. |
| License | To be chosen by the owner (MIT recommended for libraries). Confirm you have the rights to publish code derived from the original application. |
| Main component | `PdfViewer` |
| CSS class prefix | `rpv-` |
| CSS variable prefix | `--rpv-` |

---

## 2. Goals and non-goals

**Goals**
1. Behavior and visual parity with the original, using default props (01).
2. Controlled **and** uncontrolled usage for every piece of state.
3. Accepts any PDF source: URL, `URL`, `ArrayBuffer`, `Uint8Array`, `Blob`/`File`.
4. No UI-kit dependency; themeable through CSS variables; tree-shakeable; SSR-safe.
5. Accessible (WCAG 2.2 AA), keyboard-operable, internationalizable.
6. Robust: cancellation, abort, resource cleanup, and typed errors.
7. Composable: a batteries-included `PdfViewer`, plus headless hooks and primitives for custom UIs.

**Non-goals (v1)**
- PDF editing, form filling, annotation *authoring*, digital signatures.
- Bundling PDF.js inside the package (it is a peer dependency).
- Supporting React < 18.

---

## 3. Repository layout

```
/
├── CLAUDE.md
├── package.json                  # workspace root (private)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
├── .changeset/
├── .github/workflows/ci.yml
├── docs/handoff/                 # these documents
├── packages/
│   └── react-pdf-viewer/
│       ├── package.json
│       ├── vite.config.ts        # library mode
│       ├── README.md             # consumer docs (install, usage, API, CORS, worker, theming)
│       ├── src/
│       │   ├── index.ts          # 'use client' + public exports only
│       │   ├── PdfViewer.tsx     # batteries-included component
│       │   ├── components/
│       │   │   ├── Toolbar.tsx
│       │   │   ├── ToolbarButton.tsx
│       │   │   ├── ZoomGroup.tsx / PageGroup.tsx / ActionGroup.tsx
│       │   │   ├── PdfPageCanvas.tsx
│       │   │   ├── LoadingView.tsx
│       │   │   ├── ErrorView.tsx
│       │   │   ├── PasswordPrompt.tsx          (opt-in feature)
│       │   │   └── icons.tsx                   # inline SVG, Material Icons paths (Apache-2.0, attribute in NOTICE)
│       │   ├── hooks/
│       │   │   ├── usePdfDocument.ts
│       │   │   ├── usePageRenderer.ts
│       │   │   ├── useControllableState.ts
│       │   │   ├── useMediaQuery.ts
│       │   │   ├── useElementSize.ts           # ResizeObserver
│       │   │   ├── useDevicePixelRatio.ts
│       │   │   ├── useFullscreen.ts
│       │   │   └── useKeyboardShortcuts.ts
│       │   ├── core/
│       │   │   ├── pdfjs.ts          # configurePdfJs + memoized lazy loader
│       │   │   ├── loadSource.ts     # source → bytes (fetch/abort/HTTP errors)
│       │   │   ├── errors.ts         # PdfViewerError + helpers
│       │   │   ├── scale.ts          # clamp/step/round/tolerance
│       │   │   ├── fileName.ts
│       │   │   ├── download.ts
│       │   │   └── print.ts
│       │   ├── compat/
│       │   │   └── CustomPdfViewer.tsx   # drop-in wrapper with original prop names
│       │   ├── styles/pdf-viewer.css
│       │   └── types.ts
│       └── test/
└── apps/
    └── demo/                      # see 04-demo-app-spec.md
```

---

## 4. Public API

### 4.1 `<PdfViewer>` props

```ts
export type PdfSource = string | URL | ArrayBuffer | Uint8Array | Blob;
export type Rotation = 0 | 90 | 180 | 270;
export type FullscreenMode = 'controlled' | 'native' | 'overlay';
export type ToolbarAction =
  | 'zoomOut' | 'zoomLevel' | 'zoomIn'
  | 'previousPage' | 'pageIndicator' | 'nextPage'
  | 'fullscreen' | 'rotate' | 'download' | 'print';

export interface PdfViewerProps {
  /** The document. `null`/`undefined`/'' = empty state. Strings compare by value, others by identity. */
  source: PdfSource | null | undefined;
  /** Download file name. Default: derived (see 02 KI-11), else 'document.pdf'. */
  fileName?: string;

  // ── State (each controllable) ─────────────────────────────
  page?: number;            defaultPage?: number;            onPageChange?: (page: number) => void;
  scale?: number;           defaultScale?: number;           onScaleChange?: (scale: number) => void;
  rotation?: Rotation;      defaultRotation?: Rotation;      onRotationChange?: (rotation: Rotation) => void;
  fullscreen?: boolean;     defaultFullscreen?: boolean;     onFullscreenChange?: (fullscreen: boolean) => void;
  /** Default: 'controlled' if `fullscreen` prop is provided, else 'native'. */
  fullscreenMode?: FullscreenMode;

  // ── Zoom ──────────────────────────────────────────────────
  minScale?: number;        // 0.25
  maxScale?: number;        // 5
  scaleStep?: number;       // 0.05
  zoomLevels?: number[];    // opt-in preset ladder (overrides scaleStep)
  /** At the default scale, shrink the page to the container width (original behavior). Default true. */
  fitWidthAtDefaultScale?: boolean;
  fitMode?: 'none' | 'width' | 'page';   // opt-in; default 'none'

  // ── Loading ───────────────────────────────────────────────
  requestInit?: RequestInit;
  fetcher?: (url: string, init: RequestInit) => Promise<Response>;
  /** Return true if handled (suppresses error UI and onError). */
  onHttpError?: (response: Response) => boolean | void | Promise<boolean | void>;
  getHttpErrorMessage?: (response: Response) => Promise<string | undefined>;
  password?: string;                     // opt-in feature
  pdfjsOptions?: PdfJsDocumentOptions;   // per-instance overrides (cMapUrl, standardFontDataUrl, …)

  // ── Layout & features ─────────────────────────────────────
  layout?: 'single' | 'continuous';      // 'single' (parity)
  toolbar?: boolean | ToolbarConfig;     // true
  /** Viewport width (px) below which compact layout applies. Default 960. */
  compactBreakpoint?: number;
  textLayer?: boolean;                   // false
  annotationLayer?: boolean;             // false
  keyboardShortcuts?: boolean;           // true
  printMode?: 'render' | 'open-url';     // 'render'
  maxCanvasPixels?: number;              // 16_777_216
  labels?: Partial<PdfViewerLabels>;
  locale?: string;

  // ── Rendering slots ───────────────────────────────────────
  renderLoading?: () => React.ReactNode;
  renderError?: (error: PdfViewerError, actions: { retry: () => void }) => React.ReactNode;
  renderToolbar?: (api: PdfViewerApi) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;

  // ── Events ────────────────────────────────────────────────
  onDocumentLoad?: (info: { numPages: number; fingerprint: string }) => void;
  onPageRender?: (info: { page: number; scale: number; durationMs: number }) => void;
  onError?: (error: PdfViewerError) => void;
  /** Return false to prevent the default download. */
  onDownload?: (ctx: { fileName: string; data: Uint8Array }) => void | false;
  /** Return false to prevent the default print. */
  onPrint?: () => void | false;

  // ── DOM ───────────────────────────────────────────────────
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  'aria-label'?: string;   // default: labels.viewer
}

export interface ToolbarConfig {
  position?: 'bottom' | 'top';            // 'bottom' (parity)
  actions?: ToolbarAction[];              // all, in the parity order
  /** Hidden in compact, non-fullscreen mode. Default ['rotate','print'] (parity). */
  hiddenWhenCompact?: ToolbarAction[];
}
```

### 4.2 Imperative handle (`ref`)

```ts
export interface PdfViewerApi {
  readonly status: 'idle' | 'loading' | 'ready' | 'error';
  readonly numPages: number;
  readonly page: number;
  readonly scale: number;
  readonly rotation: Rotation;
  readonly fullscreen: boolean;
  goToPage(page: number): void;
  nextPage(): void;
  previousPage(): void;
  zoomIn(): void;
  zoomOut(): void;
  setScale(scale: number): void;
  resetZoom(): void;
  rotate(direction?: 'cw' | 'ccw'): void;
  toggleFullscreen(): void;
  download(): Promise<void>;
  print(): Promise<void>;
  reload(): void;
  getDocument(): PDFDocumentProxy | null;
}
// const ref = useRef<PdfViewerApi>(null); <PdfViewer ref={ref} … />
```

`renderToolbar` receives the same `PdfViewerApi` object, so custom toolbars have full control.

### 4.3 Headless exports

| Export | Purpose |
|--------|---------|
| `usePdfDocument(source, options)` | `{ status, document, numPages, error, reload }`. Handles fetch/abort/destroy and HTTP errors. |
| `<PdfPageCanvas document page scale rotation … />` | Renders one page with cancellation, HiDPI and capping. Optional text and annotation layers. |
| `<PdfToolbar api labels config />` | The default toolbar, usable standalone |
| `useControllableState` | Exported for consumers building custom controls |
| `configurePdfJs(config)` | Global PDF.js configuration (§6) |
| `defaultLabels` | English defaults |
| Types | `PdfViewerProps`, `PdfViewerApi`, `PdfViewerError`, `PdfViewerErrorCode`, `PdfSource`, `Rotation`, `ToolbarAction`, `PdfViewerLabels`, … |

Entry points (`package.json` `exports`):

| Subpath | Content |
|---------|---------|
| `.` | Everything above |
| `./styles.css` | Required stylesheet |
| `./compat` | `CustomPdfViewer` drop-in wrapper (§9) |

### 4.4 Errors

```ts
export type PdfViewerErrorCode =
  | 'PDFJS_LOAD_FAILED'    // dynamic import / worker failed
  | 'NETWORK_ERROR'        // fetch rejected (offline, CORS, DNS)
  | 'HTTP_ERROR'           // non-2xx (status set)
  | 'INVALID_PDF'          // PDF.js InvalidPDFException / MissingPDFException
  | 'PASSWORD_REQUIRED'
  | 'INCORRECT_PASSWORD'
  | 'RENDER_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'PRINT_FAILED'
  | 'UNKNOWN';

export interface PdfViewerError {
  code: PdfViewerErrorCode;
  message: string;         // human-readable; for HTTP_ERROR uses getHttpErrorMessage
  status?: number;
  cause?: unknown;
}
```

Aborted loads and cancelled renders are **never** surfaced as errors.

### 4.5 Labels (defaults = original strings)

```ts
export const defaultLabels: PdfViewerLabels = {
  viewer: 'PDF viewer',
  toolbar: 'PDF controls',
  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  zoomLevel: (percent) => `${percent}%`,
  previousPage: 'Previous page',
  nextPage: 'Next page',
  pageIndicator: (page, total) => `${page} / ${total}`,
  pageAriaLabel: (page, total) => `Page ${page} of ${total}`,
  enterFullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',
  rotate: 'Rotate PDF',
  download: 'Download PDF',
  print: 'Print PDF',
  loading: 'Loading PDF...',
  retry: 'Retry',
  empty: 'No document',
  passwordPrompt: 'This document is password protected',
  passwordSubmit: 'Open',
};
```

---

## 5. Behavior specification (delta from the original)

Everything in 01 applies unless changed here.

| Area | Rule |
|------|------|
| State | Controllable trio for page, scale, rotation and fullscreen. Callbacks fire in both modes. |
| Source change | Abort the previous load and destroy the previous doc. The page resets to `defaultPage ?? 1`, or to a clamped value when controlled (02 KI-08). The empty source shows `renderEmpty` and the label `0 / 0`. |
| Page clamp | Always clamped. Emit `onPageChange` if clamped. |
| Zoom | `round2(clamp(scale ± step))`. Buttons disabled at the bounds, with a tolerance-based comparison. |
| Rotation | Effective = `(page.rotate + rotation) % 360`. The button cycles +90. `rotate('ccw')` goes −90. |
| Rendering | One `RenderTask` at a time; newer requests cancel older ones. HiDPI output with the pixel cap. Double-buffered, no flicker. |
| Fit at 100% | When `fitWidthAtDefaultScale` and `scale ≈ defaultScale`, rendered scale = `min(scale, availableWidth / pageWidth@1)` using `ResizeObserver`. |
| Centering | Safe centering in every mode (02 KI-14). |
| Errors | Typed, `onError` always, retry, toolbar stays visible (02 KI-09). |
| Download | From loaded bytes (02 KI-11). |
| Print | Hidden-iframe render (02 KI-12), or `printMode: 'open-url'` (parity). |
| Fullscreen | Three modes (02 KI-13). The icon toggles. |
| Compact mode | `matchMedia('(max-width: ${compactBreakpoint - 0.05}px)')`, i.e. the same semantics as MUI `down('md')` at 960. Rotate and print are hidden in compact inline mode (parity). |
| Keyboard | 02 KI-22 shortcuts, active only when focus is inside the viewer. |
| While loading | Spinner in the viewport. The toolbar is visible, and document-dependent controls (page nav, download, print) are disabled. Zoom and rotate stay enabled (parity). |

---

## 6. PDF.js integration

### 6.1 Version

- Peer dependency: `pdfjs-dist` at the **current stable major**. Check with `npm view pdfjs-dist version` at scaffold time, and pin the peer range to that major, e.g. `"^5.0.0"`. Never allow `< 4.2.67` (02 KI-01).
- Also a devDependency of the package for tests, and a dependency of the demo.
- Differences from the original's 3.11 UMD usage that the implementer must handle:
  - ESM only: `import * as pdfjsLib from 'pdfjs-dist'`. The worker file is `pdfjs-dist/build/pdf.worker.min.mjs`.
  - The worker version **must equal** the API version, or PDF.js throws *"The API version … does not match the Worker version …"*.
  - Check the installed version's `page.render()` parameters (newer versions accept a `canvas` parameter alongside or instead of `canvasContext`) and the `TextLayer` / `AnnotationLayer` APIs. Follow that version's official examples.
  - Modern builds need modern browsers. `pdfjs-dist/legacy/build/pdf.mjs` exists for older targets and is selectable through `configurePdfJs({ loader })`.

### 6.2 Configuration

```ts
export interface PdfJsConfig {
  /** How to obtain the pdfjs module. Default: () => import('pdfjs-dist'). */
  loader?: () => Promise<typeof import('pdfjs-dist')>;
  /** Worker URL, or a Worker instance via workerPort. */
  workerSrc?: string;
  workerPort?: Worker;
  cMapUrl?: string;
  cMapPacked?: boolean;              // true
  standardFontDataUrl?: string;
  isEvalSupported?: boolean;         // false (security)
}
export function configurePdfJs(config: PdfJsConfig): void;
```

**Defaults when not configured:** asset URLs point at a CDN that serves the **exact installed version**, read from `pdfjsLib.version` at runtime. This mirrors the original's CDN approach and works out of the box, with no version drift:

- `workerSrc`: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
- `cMapUrl`: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/cmaps/`
- `standardFontDataUrl`: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/standard_fonts/`

Log a one-time dev-mode `console.info` recommending self-hosting.

**Self-hosting recipes** (document these in the README):
- Vite: `import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`. Copy `cmaps/` and `standard_fonts/` with `vite-plugin-static-copy`.
- webpack 5 / Next.js: `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`.
- CSP: `worker-src` must allow the worker origin (or `blob:` when using `workerPort`).

### 6.3 Loader

A module-level memoized promise: the first call imports and configures, and all instances share the result. On failure the promise resets so `reload()` can try again, and callers get `PDFJS_LOAD_FAILED`. No global `window` state.

---

## 7. Theming (CSS variables)

Defaults reproduce the original exactly. They are declared on `.rpv-root`.

| Variable | Default | Original source |
|----------|---------|-----------------|
| `--rpv-font-family` | `inherit` | host font |
| `--rpv-toolbar-bg` | `#54646E` | `customColors.grey1100` |
| `--rpv-toolbar-fg` | `#FFFFFF` | `common.white` |
| `--rpv-toolbar-radius` | `8px` | |
| `--rpv-toolbar-min-height` | `48px` | |
| `--rpv-toolbar-padding-x` | `16px` | px:2 |
| `--rpv-toolbar-gap` | `8px` | gap:1 |
| `--rpv-toolbar-max-width` | `482px` | inline only; fullscreen 100% |
| `--rpv-toolbar-margin-bottom` | `40px` | mb:5 |
| `--rpv-button-size` | `34px` | MUI small IconButton |
| `--rpv-icon-size` | `24px` | |
| `--rpv-button-hover-bg` | `rgba(255,255,255,0.1)` | |
| `--rpv-button-disabled-fg` | `rgba(255,255,255,0.3)` | |
| `--rpv-focus-ring` | `2px solid #FFFFFF` (offset 2px) | new (a11y) |
| `--rpv-label-font-size` | `14px` | |
| `--rpv-label-font-weight` | `600` | |
| `--rpv-viewport-max-width` | `650px` | desktop inline |
| `--rpv-viewport-min-height` | `712px` | desktop; compact `400px` |
| `--rpv-viewport-max-height` | `800px` | desktop inline |
| `--rpv-viewport-padding` | `0` | compact inline `16px`, fullscreen `32px` |
| `--rpv-viewport-margin-bottom` | `64px` | mb:8 |
| `--rpv-page-bg` | `#FFFFFF` | |
| `--rpv-page-border` | `1px solid #DDDDDD` | |
| `--rpv-page-radius` | `4px` | |
| `--rpv-page-shadow` | `0 2px 8px rgba(0,0,0,0.1)` | |
| `--rpv-accent` | `#1976D2` | spinner (MUI default primary; the host may set its own) |
| `--rpv-muted-fg` | `rgba(0,0,0,0.6)` | "Loading PDF..." (MUI text.secondary) |
| `--rpv-error-bg` | `#FDEDED` | MUI standard error Alert |
| `--rpv-error-fg` | `#5F2120` | |
| `--rpv-fullscreen-bg` | `#FFFFFF` | Dialog paper |

- State classes / data attributes on the root: `data-compact`, `data-fullscreen`, `data-status="loading|ready|error|idle"`, `data-zoomed`. The CSS derives per-mode values from these, so there is no JS style computation for layout.
- Ship a documented dark preset: `.rpv-root[data-theme="dark"]` or `@media (prefers-color-scheme: dark)` via opt-in `className="rpv-theme-auto"`.
- CSS lives in `@layer rpv` so consumer styles win without specificity fights.

---

## 8. Quality requirements

| Area | Requirement |
|------|-------------|
| Types | `strict`, `exactOptionalPropertyTypes` recommended, no `any` in the public surface, TSDoc on every export |
| Size | Package JS (excluding `pdfjs-dist`) ≤ 20 kB min+gzip, enforced by `size-limit` in CI |
| Render perf | No React re-render of the toolbar on render completion. Zoom bursts coalesce (only the latest render completes). |
| Memory | Docs destroyed on source change and unmount; verified by a unit test with mocks |
| SSR | Importing the package in Node doesn't throw. The server render outputs the root plus the loading state. |
| Browsers | Latest 2 versions of Chrome, Edge, Firefox and Safari (desktop + iOS). This follows the chosen `pdfjs-dist` major's support policy. |
| React | Peer `>=18.0.0`. Tested on 18 and 19, StrictMode on. |
| A11y | axe-core zero violations in e2e. Full keyboard walkthrough test. |
| Package QA | `publint` and `attw --pack` clean; `sideEffects: ["**/*.css"]` |

### 8.1 `package.json` sketch

```json
{
  "name": "@your-scope/react-pdf-viewer",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./compat": { "types": "./dist/compat.d.ts", "import": "./dist/compat.js" },
    "./styles.css": "./dist/styles.css",
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md", "LICENSE", "NOTICE"],
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0",
    "pdfjs-dist": "^<current-major>.0.0"
  },
  "engines": { "node": ">=20" }
}
```

`pdfjs-dist`, `react` and `react-dom` must be **externals** in the Vite library build.

---

## 9. Compat wrapper (drop-in for the original host app)

`@your-scope/react-pdf-viewer/compat` exports `CustomPdfViewer` with the **original prop names and semantics** (01 §3), plus one addition, so the host app can swap implementations with a one-line import change:

```ts
interface CustomPdfViewerCompatProps extends CustomPdfViewerProps /* original */ {
  /** Replaces the hard-coded auth-store purge + '/auth/sign-in' redirect. */
  onUnauthorized?: () => void;
}
```

The mapping: `pdfUrl → source`, `documentName → fileName`, `currentPage/onPageChange → page/onPageChange`, and so on. `isFullscreen` maps to `fullscreen` with `fullscreenMode: 'controlled'`. `printMode` is `'render'`. `onError` receives `error.message` (a string, as before). `onUnauthorized` is wired through `onHttpError` for status 401.

Host-app usage after migration:

```tsx
import { CustomPdfViewer } from '@your-scope/react-pdf-viewer/compat';
import '@your-scope/react-pdf-viewer/styles.css';

<CustomPdfViewer
  {...pdfViewerProps}
  onUnauthorized={() => {
    useAuthStore.getState().purgeStoreData();
    window.location.replace('/auth/sign-in');
  }}
/>
```

To match the host theme exactly, set `--rpv-toolbar-bg` / `--rpv-accent` from the MUI theme on a wrapper element.

---

## 10. Documentation deliverables (inside the new repo)

- `packages/react-pdf-viewer/README.md` covering: install (including the peer dep), quick start, worker/assets setup per bundler, CORS explainer, full props table, `PdfViewerApi`, headless usage, theming variables, labels/i18n, accessibility notes, SSR/Next.js notes, security notes (CVE and `isEvalSupported`), and the migration guide from `CustomPdfViewer`.
- `CHANGELOG.md` generated by Changesets.
- `NOTICE` attributing Material Icons SVG paths (Apache-2.0) and PDF.js (Apache-2.0).
