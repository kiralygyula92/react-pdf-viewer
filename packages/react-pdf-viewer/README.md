# @your-scope/react-pdf-viewer

> The package name is a placeholder; the owner chooses the final name before publishing.

An accessible, themeable React PDF viewer built on [PDF.js](https://github.com/mozilla/pdf.js)
(`pdfjs-dist`). One page at a time, with a toolbar for zoom, page navigation, fullscreen,
rotation, download and print. No UI-kit dependency, SSR-safe, fully typed.

- **Any source:** URL, `URL`, `ArrayBuffer`, `Uint8Array`, `Blob` / `File`.
- **Controlled or uncontrolled:** every piece of state has `value` / `defaultValue` / `onValueChange`.
- **Robust:** cancellable renders, aborted loads, destroyed documents, typed errors with retry.
- **Sharp:** HiDPI rendering with a canvas-size cap; intrinsic page rotation respected.
- **Accessible:** toolbar semantics, roving focus, keyboard shortcuts, live page announcements.
- **Composable:** batteries-included `PdfViewer`, or build your own with `usePdfDocument` + `PdfPageCanvas`.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [PDF.js worker and assets](#pdfjs-worker-and-assets)
- [Loading documents and CORS](#loading-documents-and-cors)
- [Props](#props)
- [Imperative API](#imperative-api)
- [Headless usage](#headless-usage)
- [Theming](#theming)
- [Labels and i18n](#labels-and-i18n)
- [Keyboard and accessibility](#keyboard-and-accessibility)
- [SSR and Next.js](#ssr-and-nextjs)
- [Security](#security)
- [Migrating from `CustomPdfViewer`](#migrating-from-custompdfviewer)

## Install

```sh
pnpm add @your-scope/react-pdf-viewer pdfjs-dist
```

Peer dependencies: `react` and `react-dom` ≥ 18, `pdfjs-dist` ^6.

**Browser support:** PDF.js 6 targets current browsers (it relies on recent APIs such as
`Promise.try`): the latest two versions of Chrome, Edge, Firefox and Safari. For older browsers,
use the legacy build: `configurePdfJs({ loader: () => import('pdfjs-dist/legacy/build/pdf.mjs') })`
with `pdfjs-dist/legacy/build/pdf.worker.min.mjs` as the worker.

## Quick start

```tsx
import { PdfViewer } from '@your-scope/react-pdf-viewer';
import '@your-scope/react-pdf-viewer/styles.css';

export function Report() {
  return <PdfViewer source="/files/report.pdf" />;
}
```

With default props the viewer looks and behaves like the original component: toolbar below the
page, single-page view, 5% zoom steps between 25% and 500%, and the page shrunk to the available
width at 100%.

## PDF.js worker and assets

PDF.js needs a worker script plus CMaps, standard fonts, WebAssembly decoders and ICC profiles.
Out of the box the viewer loads them from jsDelivr, pinned to the **exact installed**
`pdfjs-dist` version, and logs a one-time development notice. For production, self-host them
and call `configurePdfJs` once at startup:

**Vite**

```ts
import { configurePdfJs } from '@your-scope/react-pdf-viewer';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

configurePdfJs({
  workerSrc,
  cMapUrl: '/pdfjs/cmaps/',
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  wasmUrl: '/pdfjs/wasm/',
  iccUrl: '/pdfjs/iccs/',
});
```

Copy the asset folders with `vite-plugin-static-copy`:

```ts
// vite.config.ts
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: ['cmaps', 'standard_fonts', 'wasm', 'iccs'].map((dir) => ({
        src: `node_modules/pdfjs-dist/${dir}`,
        dest: 'pdfjs',
      })),
    }),
  ],
});
```

**webpack 5 / Next.js**

```ts
configurePdfJs({
  workerSrc: new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString(),
});
```

| `configurePdfJs` option    | Default                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `loader`                   | `() => import('pdfjs-dist')`; e.g. `() => import('pdfjs-dist/legacy/build/pdf.mjs')` for older browsers     |
| `workerSrc` / `workerPort` | jsDelivr worker for the installed version (a worker you set on `GlobalWorkerOptions` yourself is respected) |
| `cMapUrl`, `cMapPacked`    | jsDelivr `cmaps/`, `true`                                                                                   |
| `standardFontDataUrl`      | jsDelivr `standard_fonts/`                                                                                  |
| `wasmUrl`, `iccUrl`        | jsDelivr `wasm/`, `iccs/`                                                                                   |
| `isEvalSupported`          | `false`                                                                                                     |

**CSP:** `worker-src` must allow the worker origin (or `blob:` when you pass a `workerPort`), and
`connect-src` must allow the asset URLs.

## Loading documents and CORS

URL sources are fetched by the viewer with `fetch`, then handed to PDF.js as bytes. That lets the
viewer report HTTP statuses and lets you customise the request:

```tsx
<PdfViewer
  source="https://api.example.com/reports/42.pdf"
  requestInit={{ credentials: 'include' }}
  onHttpError={(response) => {
    if (response.status === 401) {
      signIn();
      return true; // handled: no error view, no onError
    }
  }}
/>
```

- `fetcher(url, init)` replaces `fetch` entirely (e.g. an authenticated `ky` or `axios` instance).
- `getHttpErrorMessage(response)` builds the error text. The default reads an RFC 7807 body
  (`detail`, then `title`), then a JSON string, then `Failed to fetch PDF: {status} {statusText}`.

**CORS still applies.** Fetching a cross-origin PDF requires the server to send
`Access-Control-Allow-Origin` for your origin; sending cookies additionally requires
`credentials: 'include'` and `Access-Control-Allow-Credentials: true`. A blocked request surfaces
as a `NETWORK_ERROR`. When you cannot change the server, proxy the file through your own origin.

Binary sources (`ArrayBuffer`, `Uint8Array`, `Blob`, `File`) are read locally and never uploaded.
Strings compare by value; binary sources compare by identity, so keep them in state rather than
creating them during render.

## Props

Every prop is optional except `source`.

| Prop                                                           | Type                                                   | Default               | Description                                                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `source`                                                       | `PdfSource \| null \| undefined`                       | —                     | The document. `null`, `undefined` or `''` show the empty state.                                                                          |
| `fileName`                                                     | `string`                                               | derived               | Download name: a `File`'s name, the URL's last `.pdf` segment, else `document.pdf`.                                                      |
| `page` / `defaultPage` / `onPageChange`                        | `number`                                               | `1`                   | 1-based page. Out-of-range values are clamped and reported. A new source opens on `defaultPage`.                                         |
| `scale` / `defaultScale` / `onScaleChange`                     | `number`                                               | `1`                   | 1 = 100% (1 PDF point per CSS pixel). `defaultScale` is also the reset target.                                                           |
| `rotation` / `defaultRotation` / `onRotationChange`            | `0 \| 90 \| 180 \| 270`                                | `0`                   | Added to each page's intrinsic rotation.                                                                                                 |
| `fullscreen` / `defaultFullscreen` / `onFullscreenChange`      | `boolean`                                              | `false`               | Fullscreen state.                                                                                                                        |
| `fullscreenMode`                                               | `'controlled' \| 'native' \| 'overlay'`                | see description       | `'controlled'` when `fullscreen` is passed (layout only; you present it), else `'native'` (Fullscreen API, falling back to `'overlay'`). |
| `minScale` / `maxScale` / `scaleStep`                          | `number`                                               | `0.25` / `5` / `0.05` | Zoom bounds and button step.                                                                                                             |
| `zoomLevels`                                                   | `number[]`                                             | —                     | Preset ladder the zoom buttons step through instead of `scaleStep`.                                                                      |
| `fitWidthAtDefaultScale`                                       | `boolean`                                              | `true`                | At the default scale, shrink the page to the available width.                                                                            |
| `fitMode`                                                      | `'none' \| 'width' \| 'page'`                          | `'none'`              | At the default scale, fill the width or fit the whole page.                                                                              |
| `requestInit`, `fetcher`, `onHttpError`, `getHttpErrorMessage` |                                                        |                       | See [Loading documents](#loading-documents-and-cors).                                                                                    |
| `password`                                                     | `string`                                               | —                     | Password for encrypted documents.                                                                                                        |
| `pdfjsOptions`                                                 | `PdfJsDocumentOptions`                                 | —                     | Per-instance `getDocument` overrides.                                                                                                    |
| `toolbar`                                                      | `boolean \| ToolbarConfig`                             | `true`                | `false` hides it; `{ position, actions, hiddenWhenCompact }` customises it.                                                              |
| `compactBreakpoint`                                            | `number`                                               | `960`                 | Viewport width (px) below which the compact layout applies.                                                                              |
| `keyboardShortcuts`                                            | `boolean`                                              | `true`                | See [Keyboard](#keyboard-and-accessibility).                                                                                             |
| `printMode`                                                    | `'render' \| 'open-url'`                               | `'render'`            | `'render'` prints through a hidden iframe; `'open-url'` opens the PDF in a new tab.                                                      |
| `maxCanvasPixels`                                              | `number`                                               | `16777216`            | Canvas pixel budget per page; resolution degrades gracefully above it.                                                                   |
| `labels`                                                       | `Partial<PdfViewerLabels>`                             | English               | Every visible string and accessible name.                                                                                                |
| `locale`                                                       | `string`                                               | browser               | Number formatting locale.                                                                                                                |
| `renderLoading`, `renderEmpty`                                 | `() => ReactNode`                                      |                       | Replace the loading / empty views.                                                                                                       |
| `renderError`                                                  | `(error, { retry }) => ReactNode`                      |                       | Replaces the document and page error views.                                                                                              |
| `renderToolbar`                                                | `(api) => ReactNode`                                   |                       | Replaces the toolbar.                                                                                                                    |
| `onDocumentLoad`                                               | `({ numPages, fingerprint }) => void`                  |                       | The document is ready.                                                                                                                   |
| `onPageRender`                                                 | `({ page, scale, width, height, durationMs }) => void` |                       | A page render completed.                                                                                                                 |
| `onError`                                                      | `(error: PdfViewerError) => void`                      |                       | Every failure except aborts, cancelled renders and handled HTTP errors.                                                                  |
| `onDownload`                                                   | `({ fileName, data }) => void \| false`                |                       | Return `false` to handle the download yourself.                                                                                          |
| `onPrint`                                                      | `() => void \| false`                                  |                       | Return `false` to handle printing yourself.                                                                                              |
| `className`, `style`, `id`, `aria-label`                       |                                                        |                       | Applied to the root element.                                                                                                             |

### Errors

`PdfViewerError` has a `code`, a `message`, an optional HTTP `status` and the original `cause`.
Codes: `PDFJS_LOAD_FAILED`, `NETWORK_ERROR`, `HTTP_ERROR`, `INVALID_PDF`, `PASSWORD_REQUIRED`,
`INCORRECT_PASSWORD`, `RENDER_FAILED`, `DOWNLOAD_FAILED`, `PRINT_FAILED`, `UNKNOWN`. The default
error view has a Retry button, and the toolbar stays usable (so fullscreen can always be exited).

## Opt-in features

Everything beyond the original viewer is off by default, so default props keep the original look
and behavior.

| Prop                  | Effect                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout="continuous"` | Vertical scrolling through all pages. Only the visible pages ±1 are rendered; the page indicator follows the scroll position.                  |
| `thumbnails`          | Page thumbnails sidebar (lazy-rendered; hidden in compact, non-fullscreen mode).                                                               |
| `textLayer`           | Selectable, copyable text that assistive technology can read.                                                                                  |
| `annotationLayer`     | Clickable links: internal links navigate, external links open in a new tab with `rel="noopener noreferrer"`.                                   |
| `search`              | Find bar with highlighting (implies `textLayer`). `Ctrl`/`⌘` + `F` focuses it; `Enter` / `Shift` + `Enter` step through matches; `Esc` clears. |
| `pageInput`           | Editable page number in the toolbar.                                                                                                           |
| `zoomLevels`          | Preset ladder for the zoom buttons, e.g. `[0.5, 1, 1.5, 2, 4]`.                                                                                |
| `zoomReset`           | The zoom label becomes a button that resets zoom.                                                                                              |
| `fitMode`             | `'width'` or `'page'`: at the default scale, fill the width or fit the whole page.                                                             |
| `wheelZoom`           | `Ctrl`/`⌘` + wheel and trackpad pinch zoom, anchored at the pointer.                                                                           |
| `passwordPrompt`      | Ask for the password of encrypted documents; `renderPasswordPrompt({ incorrect, submit })` replaces the form.                                  |

Styling hooks for these features: `--rpv-search-highlight`, `--rpv-search-highlight-selected`,
`--rpv-selection-bg`, `--rpv-page-gap` and `--rpv-thumbnails-width`.

## Imperative API

```tsx
const viewer = useRef<PdfViewerApi>(null);

<PdfViewer ref={viewer} source={file} />;

viewer.current?.goToPage(3);
```

`PdfViewerApi` exposes `status`, `numPages`, `page`, `scale`, `rotation`, `fullscreen`,
`canZoomIn`, `canZoomOut` and the actions `goToPage`, `nextPage`, `previousPage`, `zoomIn`,
`zoomOut`, `setScale`, `resetZoom`, `rotate('cw' | 'ccw')`, `toggleFullscreen`, `download()`,
`print()`, `reload()` and `getDocument()`. The same object is passed to `renderToolbar`, and
`<PdfToolbar api={api} />` renders the default toolbar anywhere.

## Headless usage

```tsx
import { PdfPageCanvas, usePdfDocument } from '@your-scope/react-pdf-viewer';

function Thumbnails({ source }: { source: string }) {
  const { status, document, numPages } = usePdfDocument(source);
  if (status !== 'ready' || !document) return null;
  return Array.from({ length: numPages }, (_, index) => (
    <PdfPageCanvas key={index} document={document} page={index + 1} scale={0.2} />
  ));
}
```

`usePdfDocument` handles fetching, aborting, HTTP errors and destroying documents.
`PdfPageCanvas` renders one page with cancellation, double buffering, HiDPI and the pixel cap.
`useControllableState` is exported for custom controls.

## Theming

Styles live in the `rpv` cascade layer, so your unlayered CSS always wins. Set custom properties
on the viewer or on any ancestor:

```css
.my-app {
  --rpv-toolbar-bg: #1f2937;
  --rpv-accent: #7c3aed;
}
```

| Variable                                                          | Default                                           |
| ----------------------------------------------------------------- | ------------------------------------------------- |
| `--rpv-font-family`                                               | `inherit`                                         |
| `--rpv-toolbar-bg` / `--rpv-toolbar-fg`                           | `#54646E` / `#FFFFFF`                             |
| `--rpv-toolbar-radius` / `--rpv-toolbar-min-height`               | `8px` / `48px`                                    |
| `--rpv-toolbar-padding-x` / `--rpv-toolbar-gap`                   | `16px` / `8px`                                    |
| `--rpv-toolbar-max-width` / `--rpv-toolbar-margin-bottom`         | `482px` (fullscreen `100%`) / `40px`              |
| `--rpv-button-size` / `--rpv-icon-size`                           | `34px` / `24px`                                   |
| `--rpv-button-hover-bg` / `--rpv-button-disabled-fg`              | `rgba(255,255,255,.1)` / `rgba(255,255,255,.3)`   |
| `--rpv-focus-ring` / `--rpv-focus-ring-offset`                    | `2px solid #FFFFFF` / `2px`                       |
| `--rpv-label-font-size` / `--rpv-label-font-weight`               | `14px` / `600`                                    |
| `--rpv-viewport-max-width` / `--rpv-viewport-max-height`          | `650px` / `800px` (compact and fullscreen `100%`) |
| `--rpv-viewport-min-height` / `--rpv-viewport-min-height-compact` | `712px` / `400px`                                 |
| `--rpv-viewport-padding` / `-compact` / `-fullscreen`             | `0` / `16px` / `32px`                             |
| `--rpv-viewport-margin-bottom`                                    | `64px`                                            |
| `--rpv-page-bg` / `--rpv-page-border`                             | `#FFFFFF` / `1px solid #DDDDDD`                   |
| `--rpv-page-radius` / `--rpv-page-shadow`                         | `4px` / `0 2px 8px rgba(0,0,0,.1)`                |
| `--rpv-accent` / `--rpv-muted-fg`                                 | `#1976D2` / `rgba(0,0,0,.6)`                      |
| `--rpv-error-bg` / `--rpv-error-fg` / `--rpv-error-icon`          | `#FDEDED` / `#5F2120` / `#D32F2F`                 |
| `--rpv-fullscreen-bg` / `--rpv-overlay-z-index`                   | `#FFFFFF` / `1300`                                |
| `--rpv-text-button-fg`                                            | `#1565C0` (Retry / Cancel text)                   |

The root exposes `data-status`, `data-compact`, `data-fullscreen`, `data-presentation` and
`data-zoomed` for state-based styling.

**Dark preset:** `className="rpv-theme-dark"` switches the viewer to dark colors;
`className="rpv-theme-auto"` follows the operating system's color scheme.

## Labels and i18n

```tsx
<PdfViewer
  source={url}
  locale="hu-HU"
  labels={{
    zoomIn: 'Nagyítás',
    zoomOut: 'Kicsinyítés',
    pageAriaLabel: (page, total) => `${page}. oldal, összesen ${total}`,
  }}
/>
```

Label functions receive a `{ formatNumber }` helper that formats with `locale`. `defaultLabels`
holds the English defaults.

## Keyboard and accessibility

While focus is inside the viewer: ← / → and PageUp / PageDown change pages (arrows scroll a zoomed
page first), Home / End jump to the first / last page, `+` / `-` zoom, `0` resets zoom, `r` / `R`
rotate, `f` toggles fullscreen. Disable with `keyboardShortcuts={false}`.

The toolbar is a single tab stop (`role="toolbar"`, arrow keys move between buttons); disabled
controls use the `disabled` attribute; the page indicator is a polite live region; each page is an
image named "Page X of N"; the document area is keyboard-scrollable; focus is visible everywhere.
The overlay fullscreen mode traps focus and closes with `Esc`.

## SSR and Next.js

The entry points start with `'use client'` and touch no browser globals at import time, so they
can be imported from Server Components files and rendered on the server (the server output is the
loading state). PDF.js itself is loaded lazily in the browser.

## Security

`pdfjs-dist` ≥ 4.2.67 is required by the peer range (^6), which rules out CVE-2024-4367 (arbitrary
JavaScript execution through crafted fonts). `isEvalSupported: false` is passed as defense in
depth. The viewer never injects `<script>` tags or reads globals.

## Migrating from `CustomPdfViewer`

The `/compat` entry exports a drop-in wrapper with the original props:

```tsx
import { CustomPdfViewer } from '@your-scope/react-pdf-viewer/compat';
import '@your-scope/react-pdf-viewer/styles.css';

<CustomPdfViewer
  {...pdfViewerProps}
  onUnauthorized={() => {
    useAuthStore.getState().purgeStoreData();
    window.location.replace('/auth/sign-in');
  }}
/>;
```

Differences from the original, all fixes: renders are cancellable and sharp on HiDPI screens,
pages with an intrinsic rotation display upright, errors keep the toolbar and offer Retry,
download reuses the loaded bytes, print opens the print dialog instead of a new tab, the
fullscreen icon toggles, the toolbar wraps instead of clipping controls on very narrow screens,
and in fullscreen the document area shrinks so the toolbar is always on screen. To match the host
theme, set `--rpv-toolbar-bg` and `--rpv-accent` on a wrapper element.

## License

To be chosen by the owner. See `NOTICE` for third-party attributions.
