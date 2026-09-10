# 01 — Current Implementation (Parity Contract)

This document specifies **exactly** what the original `CustomPdfViewer` does, down to pixel values, effect ordering, and edge cases. Treat it as the parity contract. Where the original behaves badly, this document still describes what it *does*. The corrections live in [02-known-issues.md](02-known-issues.md), and each is cross-referenced here as `→ KI-xx`.

Verbatim source: [reference/CustomPdfViewer.original.tsx](reference/CustomPdfViewer.original.tsx).

---

## 1. Purpose and context

The component shows a PDF inside a web app page. The host app uses it to show a server-generated water-test "treatment report" PDF. It renders **one page at a time** onto a single `<canvas>` using PDF.js. A dark toolbar **below** the page has zoom, page navigation, fullscreen, rotate, download and print controls.

It is a *presentational* component with **lifted state**. The page, scale, rotation and fullscreen values are owned by the parent. The parent is also responsible for actually presenting fullscreen (the host app uses a fullscreen MUI `Dialog`). See §9.

---

## 2. Runtime dependencies

| Dependency | How it is used |
|------------|----------------|
| React 19 | Hooks: `useState`, `useRef`, `useEffect`, `useCallback`, `useMemo`, `memo` |
| `@mui/material` 7 | `Box`, `IconButton`, `Typography`, `Toolbar`, `CircularProgress`, `Alert`, `useTheme` |
| `@mui/icons-material` 7 | `ZoomIn`, `ZoomOut`, `NavigateBefore`, `NavigateNext`, `RotateRight`, `Download`, `Print`, `Fullscreen` |
| PDF.js 3.11.174 | **Not an npm dependency.** It is injected at runtime as a `<script>` from a CDN and used through the global `window.pdfjsLib` (typed `any`) |
| Host `useIsMobile()` | `useMediaQuery(theme.breakpoints.down('md'))`. The host theme sets `md = 960`, so "mobile" means viewport width < 960px |
| Host `useAuthStore` (zustand) | On HTTP 401: `useAuthStore.getState().purgeStoreData()` then `window.location.replace('/auth/sign-in')` |
| Host constants / types | See [reference/supporting-code.md](reference/supporting-code.md) |

The default export is `memo(CustomPdfViewer)`, a shallow prop comparison.

---

## 3. Public API (props)

```ts
interface CustomPdfViewerProps {
  pdfUrl: string;
  documentName?: string;
  onError?: (error: string) => void;
  isFullscreen?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  rotation?: number;
  onRotationChange?: (rotation: number) => void;
}
```

| Prop | Default used internally | Exact behavior |
|------|------------------------|----------------|
| `pdfUrl` | — (required) | Fetched with bare `fetch(pdfUrl)`: no headers, default `credentials: 'same-origin'`. `''` means no document: loading is off, the page area is empty, and the label shows `0 / 0`. A change triggers a full reload (§6.2). |
| `documentName` | `'treatment-report.pdf'` | File name used by **Download**. |
| `onError` | — | Called with a message string **only** when document loading fails (fetch, HTTP or parse). **Not** called when the PDF.js library fails to load, or when a page fails to render. → KI-09 |
| `isFullscreen` | `false` | **Layout switch only.** The component never enters fullscreen by itself. It changes sizes and padding (§8) and shows extra buttons on mobile. |
| `onFullscreenChange` | — | The fullscreen button calls `onFullscreenChange(!isFullscreen)`. |
| `currentPage` | `1` (`?? 1`) | 1-based. Clamped to `[1, numPages]` **only when rendering**. The label shows the unclamped value. → KI-08 |
| `onPageChange` | — | Called by Previous/Next with `currentPage ∓ 1`. It is also called **once after each successful document load** with `currentPage ?? 1` (see §6.2 step 10). |
| `scale` | `1.0` | 1.0 = 100% = 1 PDF point per CSS pixel. |
| `onScaleChange` | — | Zoom buttons call it with `scale ± 0.05`, clamped to `[0.25, 5.0]`. |
| `rotation` | `0` | Degrees clockwise. Passed straight into `page.getViewport({ scale, rotation })`, which **replaces** the page's intrinsic `/Rotate` instead of adding to it. → KI-03 |
| `onRotationChange` | — | The rotate button calls it with `(rotation + 90) % 360`. |

### 3.1 Controlled-only in practice

The source has a comment reading *"Use external state if provided, otherwise use internal state"*, but there is **no internal state** for page, scale, rotation or fullscreen. The component reads `prop ?? default` and asks the parent to change values through callbacks. If a parent passes neither the value nor the callback, the buttons do nothing. → KI-05

---

## 4. Internal state and refs

| Name | Kind | Initial | Purpose |
|------|------|---------|---------|
| `pdfDoc` | state `PDFDocument \| null` | `null` | Loaded document proxy (`numPages`, `getPage`) |
| `isLoading` | state `boolean` | **`true`** | Controls the spinner and whether the canvas is mounted |
| `error` | state `string \| null` | `null` | When non-null, the **whole component** renders only an error Alert (§8.6) |
| `pdfJsReady` | state `boolean` | `false` | PDF.js global is available and the worker is configured |
| `pdfJsLoadingRef` | ref `boolean` | `false` | Per-instance guard: "I started injecting the script" |
| `pdfLoadingRef` | ref `boolean` | `false` | Per-instance guard: "a document load is in flight" |
| `timeoutRef` | ref timer | `null` | 15-second library-load timeout |
| `initialPageSetRef` | ref `boolean` | `false` | Ensures the post-load `onPageChange` call happens only once per URL |
| `canvasRef` | ref `HTMLCanvasElement` | — | The single render target |

Derived values: `zoomPercentage = Math.round(scale * 100)`, and `pageNumberText = pdfDoc ? \`${currentPage} / ${numPages}\` : '0 / 0'`.

---

## 5. Constants

| Constant | Value | Used for |
|----------|-------|----------|
| `PDF_JS_VERSION` | `'3.11.174'` | CDN URL building |
| `PDF_JS_LOAD_TIMEOUT` | `15000` ms | Library bootstrap timeout |
| `PDF_JS_CHECK_INTERVAL` | `100` ms | Polling in `waitForPdfJs` |
| `PDF_JS_CHECK_TIMEOUT` | `10000` ms | Polling timeout in `waitForPdfJs` |
| `MIN_SCALE` | `0.25` | Zoom floor (25%) |
| `MAX_SCALE` | `5.0` | Zoom ceiling (500%) |
| `DEFAULT_SCALE` | `1.0` | Layout "fit" rules compare against this with `===` / `<=` → KI-16 |
| `SCALE_STEP` | `0.05` | Zoom increment (5%) |
| `ROTATION_STEP` | `90` | Rotation increment |
| `PDF_JS_CDN_URLS` | cdnjs → unpkg → jsdelivr (`…/pdf.min.js`) | Tried in order |
| `PDF_JS_WORKER_URLS` | Same three hosts (`…/pdf.worker.min.js`) | Chosen by the same index as the script that loaded |
| `CMAP_URL` | `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/` | `getDocument({ cMapUrl, cMapPacked: true })` |

The exact URLs are in [reference/supporting-code.md](reference/supporting-code.md#constants).

---

## 6. Lifecycle

### 6.1 Effect A — PDF.js bootstrap (runs once on mount, `[]`)

1. If `window.pdfjsLib` already exists, set `pdfJsReady = true` and stop.
2. If this instance's `pdfJsLoadingRef` is true, stop. Otherwise set it to true.
3. Start a **15s timeout**. When it fires, `isLoading = false` and `error = 'PDF.js library failed to load within timeout period'`.
4. If a `<script src*="pdf.min.js">` already exists in the DOM (injected by another instance), attach `load`/`error` listeners to it. **On load, this path clears the timeout but does NOT set `pdfJsReady`.** → KI-06
5. Otherwise, try the CDNs in order (index 0, 1, 2):
   - Create `<script async src=CDN[i]>` and append it to `<head>`.
   - `onload`: clear the timeout, set `window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER[i]`, and set `pdfJsReady = true`.
   - `onerror`: remove the script, then try `i + 1`.
   - All failed: reject with `'All PDF.js CDNs failed to load'`. The catch clears the timeout and sets `error` and `isLoading = false`.
6. Cleanup (unmount): clear the timeout. The injected script stays in the DOM and the global stays set, so later mounts take the fast path in step 1.

### 6.2 Effect B — Document load (`[pdfUrl, pdfJsReady]`)

1. If `pdfUrl` is falsy, set `pdfDoc = null` and `isLoading = false`, then return.
2. If `!pdfJsReady || !window.pdfjsLib`, return. `isLoading` stays `true`, so the spinner shows.
3. If `pdfLoadingRef` is true, return. Otherwise set it to true.
4. Set `isLoading = true` and `error = null`. **This is the only place the error is ever cleared.**
5. `waitForPdfJs()` polls every 100ms, with a 10s timeout. It is effectively a no-op because step 2 already guaranteed the global.
6. `response = await fetch(pdfUrl)`.
   - **401** resets the guard, sets `isLoading = false`, calls `purgeStoreData()`, then `window.location.replace('/auth/sign-in')`, and returns. No error UI and no `onError`.
   - **Other non-2xx:** the message defaults to `` `Failed to fetch PDF: ${status} ${statusText}` ``. The code then tries `response.clone().json()`: `detail` is used if present (RFC 7807 ProblemDetails), else `title`, else the body itself if it is a JSON string. It then throws that message.
   - A thrown fetch error with `error.response.status === 401` also triggers the redirect. That is dead code with native `fetch`. → KI-25
   - A non-`Error` throwable becomes `'Failed to fetch PDF document'`.
7. `arrayBuffer = await response.arrayBuffer()`.
8. `pdf = await pdfjsLib.getDocument({ data: arrayBuffer, cMapUrl: CMAP_URL, cMapPacked: true }).promise`. There is no `isEvalSupported: false` (→ KI-01) and no `standardFontDataUrl` (→ KI-20).
9. `setPdfDoc(pdf)`.
10. If `!initialPageSetRef && onPageChange`, call `onPageChange(currentPage ?? 1)` and set the flag. Because the component remounts on fullscreen toggle (§9), this re-reports the preserved page.
11. On any error: `error = message`, `onError?.(message)`, `pdfDoc = null`.
12. `finally`: `isLoading = false` and the guard resets.
13. Cleanup (on URL change or unmount): reset both `pdfLoadingRef` and `initialPageSetRef`. **The in-flight request is not aborted and the previous document is not destroyed.** → KI-07

The code comment says: *"Fetch PDF as blob/ArrayBuffer to bypass CORS restrictions"*. That is incorrect: `fetch` is subject to the same CORS rules. The real benefit is that the app controls the request and can inspect status codes, which is what makes the 401 handling possible. → KI-10

### 6.3 Page rendering (`renderPage`, `useCallback([pdfDoc, currentPage, scale, rotation])`)

Effect C `[renderPage, pdfDoc, isLoading]` calls `renderPage()` when `pdfDoc && !isLoading`.

1. `pageNum = clamp(currentPage, 1, numPages)`.
2. `page = await pdfDoc.getPage(pageNum)`.
3. `viewport = page.getViewport({ scale, rotation })`.
4. `canvas.width = viewport.width` and `canvas.height = viewport.height`. The canvas truncates these to integers. There is **no devicePixelRatio scaling**. → KI-04
5. Imperatively set `canvas.style.width = viewport.width + 'px'` and `style.height = viewport.height + 'px'`. These fight the React `style` prop. → KI-15
6. `await page.render({ canvasContext, viewport }).promise`. The previous render task is **not cancelled**. → KI-02
7. On error: `error = message`. The whole viewer becomes an error Alert, and `onError` is not called.

The canvas element is **conditionally mounted**. It does not exist while `isLoading` is true, and it mounts when loading finishes. Effect C runs after that commit, so the ref is populated.

### 6.4 Effect summary

| Effect | Deps | Triggers |
|--------|------|----------|
| A bootstrap | `[]` | Mount |
| B document | `[pdfUrl, pdfJsReady]` | URL change, library ready |
| C render | `[renderPage, pdfDoc, isLoading]` | Page, scale or rotation change, document loaded, loading finished |

---

## 7. Controls

The toolbar has three groups, laid out with `justify-content: space-between`.

| Group | Order | Control | Icon (Material) | `aria-label` | Action | Disabled when | Visible when |
|-------|-------|---------|-----------------|--------------|--------|---------------|--------------|
| Zoom | 1 | Zoom out | `ZoomOut` | `Zoom out` | `onScaleChange(max(scale-0.05, 0.25))` | `scale <= 0.25` | always |
| Zoom | 2 | Zoom label | — | — | Text `{Math.round(scale*100)}%` | — | always |
| Zoom | 3 | Zoom in | `ZoomIn` | `Zoom in` | `onScaleChange(min(scale+0.05, 5))` | `scale >= 5` | always |
| Pages | 4 | Previous | `NavigateBefore` | `Previous page` | `onPageChange(page-1)` if `page > 1` | `!pdfDoc \|\| page <= 1` | always |
| Pages | 5 | Page label | — | — | Text `{page} / {numPages}`, or `0 / 0` | — | always |
| Pages | 6 | Next | `NavigateNext` | `Next page` | `onPageChange(page+1)` if `page < numPages` | `!pdfDoc \|\| page >= numPages` | always |
| Actions | 7 | Fullscreen | `Fullscreen` (**same icon in both states**) | `Enter fullscreen` / `Exit fullscreen` | `onFullscreenChange(!isFullscreen)` | never | always |
| Actions | 8 | Rotate | `RotateRight` | `Rotate PDF` | `onRotationChange((rotation+90)%360)` | never | desktop, or mobile + fullscreen |
| Actions | 9 | Download | `Download` | `Download PDF` | See §7.1 | never | always |
| Actions | 10 | Print | `Print` | `Print PDF` | `window.open(pdfUrl, '_blank')` → KI-12 | never | desktop, or mobile + fullscreen |

Zoom, rotate, download and print stay **enabled while the document is loading or missing**. Zoom and rotate still call the callbacks, so the parent's state changes even with no document.

There are **no keyboard shortcuts**, no page-number input, no fit-width or fit-page options, and no zoom reset. → KI-17, KI-22, KI-24

### 7.1 Download algorithm

1. `fileName = documentName || 'treatment-report.pdf'`.
2. `fetch(pdfUrl)` again: a **second network request**, and the loaded bytes are not reused. → KI-11
3. On 401: purge the auth store and redirect to `/auth/sign-in`.
4. On non-2xx, build the same ProblemDetails message as §6.2 and throw it. The catch below swallows it silently, so the user is never told.
5. `blob → URL.createObjectURL`, then a hidden `<a download=fileName>` is appended to `body`. Inside `requestAnimationFrame` it is clicked, and 100ms later it is removed and the URL revoked.
6. **Catch fallback:** a hidden `<a href=pdfUrl download=fileName target=_blank>` is clicked. Browsers ignore `download` for cross-origin URLs, so this opens a new tab.

---

## 8. Layout and visual spec

MUI spacing multipliers are shown with their pixel values at the **default 8px spacing unit**. MUI `IconButton size="small"` renders an ≈34×34px button around a 24px icon.

### 8.1 Structure

```
Root Box (column, center)
├── Viewport Box  (scroll container; holds spinner OR canvas)
│   └── <canvas>  (or loading overlay)
└── Toolbar wrapper Box (max-width)
    └── MUI Toolbar  [ Zoom group ] [ Page group ] [ Action group ]
```

```
┌──────────────── viewport (≤650px wide desktop inline) ────────────────┐
│                                                                        │
│                     ┌──────────────────────────┐                       │
│                     │                          │                       │
│                     │        PDF page          │                       │
│                     │        (canvas)          │                       │
│                     │                          │                       │
│                     └──────────────────────────┘                       │
└────────────────────────────────────────────────────────────────────────┘
                              (64px gap)
          ┌──────────────── toolbar (≤482px) ────────────────┐
          │ (−) 100% (+)     ‹  1 / 3  ›      ⛶  ⟳  ⤓  🖶     │
          └──────────────────────────────────────────────────┘
                              (40px gap)
```

### 8.2 Root Box

| Property | Value |
|----------|-------|
| display | `flex`, `flex-direction: column`, `align-items: center` |
| height | `100vh` when fullscreen, else `auto` |
| width / max-width | `100%` / `100%` |
| background / border | `transparent` / `none` |
| border-radius | `8px` |

### 8.3 Viewport Box (scroll container)

| Property | Desktop inline | Desktop fullscreen | Mobile inline | Mobile fullscreen |
|----------|---------------|--------------------|---------------|-------------------|
| padding | `0` | `32px` (p:4) | `16px` (p:2) | `32px` (p:4) |
| max-width | `650px` | `100%` | `100%` | `100%` |
| min-height | `712px` | `712px` | `400px` | `400px` |
| max-height | `800px` | `100%` | `100%` | `100%` |
| justify-content | see rule below | | | |

Common to all states: `flex: 1`, `display: flex`, `align-items: flex-start`, `overflow: auto`, `position: relative`, `margin-bottom: 64px` (mb:8), `width: 100%`, transparent background.

**`justify-content` rule:** use `center` if `scale <= 1.0`, or if `scale > 1.0 && !mobile && fullscreen`. Otherwise use `flex-start`.
*Why:* when a flex child overflows a `center`-justified scroll container, the overflow on the left can't be reached by scrolling. Switching to `flex-start` when zoomed avoids that. Desktop fullscreen keeps `center`, so the bug still happens there once the page is wider than the viewport. → KI-14

### 8.4 Canvas

| Property | Value |
|----------|-------|
| border | `1px solid #ddd` |
| border-radius | `4px` |
| background | `white` |
| box-shadow | `0 2px 8px rgba(0,0,0,0.1)` |
| display | `block` |
| max-width | `100%` when `scale === 1.0`, else `none` |
| max-height | `fit-content` when `scale === 1.0`, else `none` |
| width (React style) | `100%` when `mobile && scale === 1.0 && !fullscreen`, else `auto` |
| width/height (imperative) | `viewport.width`px / `viewport.height`px, set after every render. It overrides the React `width` after the first render. |

**Intended behavior to reproduce:** at exactly 100%, the page shrinks to fit the container width, keeping its aspect ratio. At any other zoom, it shows at true size (`scale × page points`) and the container scrolls. The actual mechanism is fragile: an imperative px height combined with a CSS `max-width` can distort the aspect ratio in narrow containers. Reproduce the *intent* and confirm against screenshots of the original. → KI-15

### 8.5 Toolbar

| Element | Property | Value |
|---------|----------|-------|
| Wrapper Box | max-width | `482px` inline, `100%` fullscreen |
| Toolbar | background | Host theme `palette.customColors.grey1100` = **`#54646E`**, fallback `palette.grey[800]` = `#424242` |
| | color | `#FFFFFF` (`common.white`) |
| | border-radius | `8px` |
| | min-height | `48px` (on desktop too; it overrides MUI's 64px) |
| | padding-x | `16px` (px:2) |
| | layout | `flex`, `justify-content: space-between`, `align-items: center` |
| | margin-bottom | `40px` (mb:5) |
| Group Box | layout | `flex`, `align-items: center`, `gap: 8px` |
| IconButton | size | `small` |
| | color | white |
| | hover bg | `rgba(255,255,255,0.1)` |
| | disabled color | `rgba(255,255,255,0.3)` |
| Zoom label | typography | `body2`, `font-size: 14px`, `font-weight: 600`, centered, `min-width: 40px` |
| Page label | typography | Same, with `min-width` `80px` desktop / `40px` mobile |

### 8.6 Loading and error views

**Loading** (inside the viewport Box, `isLoading === true`): an absolutely centered overlay (`top/left 50%`, `translate(-50%,-50%)`, `z-index: 1`). It is a column with a 16px gap containing an MUI `CircularProgress` (40px, theme primary color) above `Loading PDF...` (`body1`, `text.secondary`). **The toolbar still shows** under the viewport while loading.

**Error** (`error !== null`): replaces the **entire** component, so there is **no toolbar**. It is a flex column Box, centered both ways, with `height: 400px` and `padding: 32px`, containing an MUI `<Alert severity="error">` with `margin-bottom: 16px` that shows the message. The standard MUI error Alert looks like this: background `#FDEDED`, text `#5F2120`, an error-outline icon, radius 4px, padding 6px 16px. There is no retry. The only way out is a new `pdfUrl` or a remount. → KI-09

### 8.7 Responsive matrix: what changes on mobile (< 960px)

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| Rotate button | shown | shown **only in fullscreen** |
| Print button | shown | shown **only in fullscreen** |
| Page label min-width | 80px | 40px |
| Viewport padding (inline) | 0 | 16px |
| Viewport max-width (inline) | 650px | 100% |
| Viewport min-height | 712px | 400px |
| Viewport max-height (inline) | 800px | 100% |
| Canvas width at 100%, inline | auto | 100% (intent: fit width) |
| Zoomed > 100% in fullscreen | centered | left-aligned (`flex-start`) |

---

## 9. Consumer integration pattern (host app)

Verbatim: [reference/ViewReportSection.original.tsx](reference/ViewReportSection.original.tsx).

- The parent keeps `isFullscreen`, `currentPage` (1), `scale` (1.0) and `rotation` (0) in `useState`, and passes stable `useCallback` setters.
- The parent builds `documentName` as `treatment-report-YYYY-MM-DD.pdf` from the report's generation date.
- **Fullscreen is implemented by the parent.** When `isFullscreen` is true, the parent renders the viewer inside `<Dialog fullScreen>` with `DialogContent` set to `p: 0`, `height: 100vh` and flex column, and the Dialog's paper with margin 0 and max 100vh/100vw. When false, the parent renders it inside a centered full-width Box.
  - Because the element tree changes, **the viewer unmounts and remounts on every toggle**. The PDF is re-fetched and re-parsed each time. → KI-13
  - The lifted state is what keeps the page, zoom and rotation across that remount.
  - `Esc` or a backdrop close calls `setIsFullscreen(false)` through `Dialog.onClose`.
- The parent memoizes the whole props object, and it is `memo`'d with a comparator that checks **only** `pdfUrl`.
- The inline container is the main column of a 12-column grid (`md: 8.5` of 12). At desktop widths the 650px viewport cap is therefore the effective width.

---

## 10. Edge-case behavior reference

| Scenario | Original behavior |
|----------|-------------------|
| `pdfUrl=''` on mount | `isLoading` starts true, so the spinner flashes until Effect B runs and sets it false. The viewport is then empty and the label shows `0 / 0`. Zoom, rotate and fullscreen buttons still work. |
| URL changes while a load is in flight | The guard is reset in cleanup, so a second load starts. The first is not aborted, and whichever resolves **last** wins `setPdfDoc`, even if it is the stale one. → KI-07 |
| URL changes after load | The old `pdfDoc` stays in state until the new one loads. The spinner shows because the canvas is unmounted. `currentPage` is **not reset**. → KI-08 |
| `currentPage > numPages` | Renders the last page, but the label shows e.g. `5 / 3`. Next is disabled and Previous goes to 4. |
| Page with intrinsic `/Rotate 90` | Shown **unrotated** at rotation 0. → KI-03 |
| Rapid zoom clicks | Overlapping `page.render` calls on one canvas. PDF.js throws *"Cannot use the same canvas during multiple render() operations"* and the viewer turns into the error Alert. → KI-02 |
| Password-protected PDF | The `getDocument` promise rejects with PDF.js's `PasswordException`, and the message goes into the error Alert. → KI-23 |
| Non-PDF response (e.g. HTML login page with 200) | PDF.js reports "Invalid PDF structure" in the error Alert. |
| Two viewers mounting at once (cold) | The first injects the script. The second finds it but never sets `pdfJsReady`, so after 15s it shows the timeout error. → KI-06 |
| React StrictMode (dev) | The effect runs, cleans up (clearing the timeout), and runs again. The second run exits early because of the ref, so **no timeout protection** remains. Loading still succeeds. → KI-19 |
| 401 during load or download | Auth store purged, then hard redirect to `/auth/sign-in`. |
| Non-2xx with ProblemDetails JSON | Alert shows `detail`, falling back to `title`. |
| HiDPI screens | The canvas backing store is 1× CSS px, so output looks blurry on retina. → KI-04 |
| Zoom 100% → +10 steps | Internal scale becomes `1.5000000000000004` (verified). The display rounds it to `150%`. → KI-16 |
