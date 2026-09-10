# 02 — Known Issues, Risks and Limitations

Found by reviewing the original `CustomPdfViewer` (see [01-current-implementation.md](01-current-implementation.md)). Each item lists the symptom, the root cause, the required fix in the new package, and the **default policy**:

- **Fix by default:** the new package fixes it unconditionally. Nobody could reasonably depend on the broken behavior.
- **Opt-in:** a new capability behind a prop. The default keeps original UX parity.
- **Generalize:** host-app coupling that becomes a generic extension point.

## Summary

| ID | Title | Severity | Policy |
|----|-------|----------|--------|
| KI-01 | PDF.js 3.11.174 vulnerable to CVE-2024-4367; `isEvalSupported` not disabled | **Critical** | Fix by default |
| KI-02 | Overlapping renders on one canvas crash the viewer | **High** | Fix by default |
| KI-03 | Intrinsic page `/Rotate` is overridden | High | Fix by default |
| KI-04 | Blurry output on HiDPI screens | High | Fix by default |
| KI-05 | Claims uncontrolled support but has none | High | Fix by default |
| KI-06 | Second concurrently-mounted instance never becomes ready | High | Fix by default (new loader) |
| KI-07 | No abort on source change; stale doc can win; docs never destroyed | High | Fix by default |
| KI-08 | Page not reset or clamped on source change; label can show `5 / 3` | Medium | Fix by default |
| KI-09 | Error state is terminal, hides the toolbar, and `onError` is incomplete | Medium | Fix by default |
| KI-10 | CORS misconception; no way to send headers or credentials | Medium | Generalize |
| KI-11 | Download re-fetches the file; errors swallowed | Medium | Fix by default |
| KI-12 | "Print" only opens a new tab | Medium | Fix by default (real print) |
| KI-13 | Fullscreen delegated to parent; remount re-downloads; icon never toggles | Medium | Opt-in native fullscreen + icon fix by default |
| KI-14 | Centered overflow clips the left side (desktop fullscreen) | Medium | Fix by default |
| KI-15 | Canvas sizing split between React style and imperative style | Medium | Fix by default |
| KI-16 | Floating-point zoom drift; `=== 1.0` checks fragile | Low | Fix by default |
| KI-17 | Only 5% steps; no presets, fit-width, fit-page or reset | Low | Opt-in |
| KI-18 | Host-app coupling (auth store, redirect, file name, MUI theme, breakpoint) | — | Generalize |
| KI-19 | Runtime CDN script injection (CSP, supply chain, timeout quirks) | Medium | Fix by default |
| KI-20 | No `standardFontDataUrl` | Low | Fix by default |
| KI-21 | No text layer or annotation layer (no select, search, or links) | Medium | Opt-in |
| KI-22 | Accessibility gaps | Medium | Fix by default |
| KI-23 | Password-protected PDFs unsupported | Low | Opt-in |
| KI-24 | Single-page only; no page input, thumbnails or continuous scroll | Low | Opt-in |
| KI-25 | Dead or redundant code | Low | Fix (don't port) |
| KI-26 | Canvas size limits once HiDPI is applied | Medium | Fix by default |
| KI-27 | Hard-coded English strings | Low | Fix by default (labels prop; English defaults) |

---

## KI-01 — Security: CVE-2024-4367 (arbitrary JavaScript execution)

- **Symptom:** A crafted PDF can execute arbitrary JavaScript in the viewer's origin when opened with PDF.js before 4.2.67 while `isEvalSupported` is left at its default (`true`). The original uses **3.11.174** and does not pass `isEvalSupported: false`.
- **Fix:** Use a patched `pdfjs-dist` (≥ 4.2.67; target the current stable major). Also always pass `isEvalSupported: false` to `getDocument` as defense in depth. Set the peer dependency range so vulnerable versions can't be installed.
- **Also recommended for the original host app:** until it migrates, add `isEvalSupported: false` to its `getDocument` call.

## KI-02 — Concurrent renders on the same canvas

- **Symptom:** Rapid zoom or page clicks start a new `page.render()` before the previous one finishes. PDF.js throws *"Cannot use the same canvas during multiple render() operations"*. The catch sets `error`, and the whole viewer is replaced by an error Alert.
- **Fix:** Keep the active `RenderTask` in a ref. Before starting a new render, call `task.cancel()`, and treat `RenderingCancelledException` as a normal, silent outcome. Also coalesce bursts of changes (render only the latest request). **Double-buffer** to avoid flicker: render to an offscreen canvas and then swap or copy it onto the visible canvas.

## KI-03 — Intrinsic page rotation overridden

- **Symptom:** `page.getViewport({ scale, rotation })` treats `rotation` as absolute, and the default is `page.rotate`. Passing the user rotation (0) therefore discards the page's own `/Rotate`, so scanned documents saved "rotated" show sideways.
- **Fix:** `rotation: (page.rotate + userRotation) % 360`. The public `rotation` prop stays *relative to the document's natural orientation*.

## KI-04 — Blurry on HiDPI

- **Fix:** The backing store is `floor(viewport.width * outputScale)` × `floor(viewport.height * outputScale)`. The CSS size is `viewport.width` × `viewport.height`. Render with `transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined`. `outputScale = window.devicePixelRatio || 1`, capped per KI-26. Re-render when `devicePixelRatio` changes, which happens when the window moves between monitors (`matchMedia('(resolution: Xdppx)')` listener).

## KI-05 — Not actually uncontrolled-capable

- **Fix:** Implement the standard controllable-state pattern for `page`, `scale`, `rotation` and `fullscreen`. Each uses `value` / `defaultValue` / `onValueChange`. Internal state is used when `value === undefined`. Callbacks always fire. Warn in development if a prop switches between controlled and uncontrolled.

## KI-06 — Concurrent instances and the script loader

- **Symptom:** The "existing script" branch never sets `pdfJsReady`, so a second viewer mounted during a cold load times out after 15s.
- **Fix:** This goes away with KI-19. Use one **module-level memoized promise** (`let pdfjsPromise: Promise<PdfJs> | null`), shared by all instances, which does `import('pdfjs-dist')` and configures the worker once.

## KI-07 — Source-change races and leaks

- **Symptom:** Nothing is aborted. A slow earlier request can resolve after a newer one and overwrite `pdfDoc` with the wrong document. Old `PDFDocumentProxy` objects are never destroyed, so memory and worker resources accumulate.
- **Fix:** Each load gets an `AbortController` (for fetch) plus a monotonically increasing load id. Results from stale ids are discarded. On source change or unmount: `abort()`, `loadingTask.destroy()`, and `pdfDoc.destroy()` for the previous document. Call `page.cleanup()` for pages that are no longer displayed.

## KI-08 — Page not reset or clamped on source change

- **Fix:** On a *new* document, reset the page to `defaultPage` (uncontrolled), or call `onPageChange(1)` when the controlled page is out of range. Always clamp the displayed and rendered page to `[1, numPages]`, and emit `onPageChange` with the clamped value when clamping happens. The label never shows out-of-range numbers.
- Keep the useful part of the original: a remount with the same source and a valid controlled page must stay on that page.

## KI-09 — Error handling

- **Symptoms:** The error view replaces everything. There is no toolbar (a mobile fullscreen user can't press the fullscreen button to exit), no retry, and `onError` is not called for library-load or render errors.
- **Fix:**
  - Typed errors: `PdfViewerError { code, message, status?, cause? }` (see 03 §4.4).
  - `onError` fires for **every** failure category except aborts and cancelled renders.
  - The default error view keeps the original look (red Alert, 400px tall area) and adds a **Retry** button. The toolbar stays visible, with document-dependent controls disabled, so the user can still exit fullscreen.
  - A render error on one page is shown in place of that page. It does not unmount the viewer.
  - `renderError(error, { retry })` lets consumers customize the view.

## KI-10 — CORS misconception; no request customization

- **Fact:** `fetch()` is subject to CORS exactly like PDF.js's own loader. Cross-origin PDFs need `Access-Control-Allow-Origin` on the server. Cookies are only sent cross-origin with `credentials: 'include'`, plus server `Access-Control-Allow-Credentials`.
- **Fix:** Keep "we fetch, then pass bytes to PDF.js" as the default, because it enables status handling. Also expose:
  - `requestInit` (headers, credentials, and so on).
  - `fetcher(url, init)` to fully replace the transport, for example an authenticated `ky` or `axios` instance.
  - `onHttpError(response)`, which returns `true` when handled (suppresses the error UI). This is how a host reproduces the original 401 → redirect.
  - `getHttpErrorMessage(response)`. The default is the original ProblemDetails logic: `detail` → `title` → JSON string → `` `Failed to fetch PDF: ${status} ${statusText}` ``.
- Document CORS clearly in the package README and the demo.

## KI-11 — Download

- **Fix:** Use the bytes already loaded: `await pdfDoc.getData()` gives a `Uint8Array`, which becomes a `Blob` of `application/pdf` and then an object URL. Click a hidden `<a download>`, then revoke the URL. This works for every source type (URL, Blob, ArrayBuffer) without a second request.
- The file name resolves in this order: `fileName` prop → `Blob`/`File` name → last URL path segment ending in `.pdf` → `'document.pdf'`.
- Failures raise `onError({ code: 'DOWNLOAD_FAILED' })`. `onDownload` can intercept (return `false` to prevent the default).

## KI-12 — Print

- **Symptom:** `window.open(pdfUrl, '_blank')` is not a print. It can be popup-blocked, doesn't carry auth headers, and relies on the browser's own PDF viewer.
- **Fix (default):** Render every page to an image at print resolution (≈150 DPI, so scale ≈ 150/72) into a hidden `<iframe>` with `@page { margin: 0 }` and one page per sheet. Wait for the images to load, call `iframe.contentWindow.print()`, and remove the iframe on `afterprint`. Show progress for large documents and allow cancellation. `onPrint` can intercept. Provide `printMode: 'render' | 'open-url'`, where `'open-url'` is original parity.

## KI-13 — Fullscreen

- **Symptoms:** Fullscreen needs the parent to render a dialog. The remount re-fetches the PDF. The icon is `Fullscreen` in both states.
- **Fix:**
  - The icon toggles between `Fullscreen` and `FullscreenExit` (fix by default).
  - `fullscreenMode` prop:
    - `'controlled'` (**parity default** when a `fullscreen` prop is passed): layout-only, and the parent decides.
    - `'native'`: the Fullscreen API on the viewer root. It falls back to `'overlay'` where element fullscreen isn't available (iPhone Safari).
    - `'overlay'`: a `position: fixed; inset: 0` layer with a portal, focus trap and `Esc` to close.
    - Default when uncontrolled: `'native'`.
  - With `'native'` or `'overlay'`, the document is **not** re-loaded (no remount).

## KI-14 — Centered overflow clipping

- **Fix:** Use "safe" centering. Wrap the page in an inner element with `margin: auto` inside a `display: flex` scroll container, or use `justify-content: safe center` with a `margin: auto` fallback. The page is then centered when it fits and fully scrollable when it doesn't, in every mode. This makes the original's `flex-start` special case unnecessary.

## KI-15 — Canvas sizing

- **Fix:** One owner for sizing: the renderer sets the canvas CSS size from the viewport. "Fit to width at 100%" becomes an explicit computation. Measure the container width (`ResizeObserver`) and, in fit mode, compute `effectiveScale = min(scale, containerWidth / pageWidthAtScale1)`. Never use CSS `max-width` to shrink the canvas, which distorts it and wastes resolution.
- **Parity note:** the original's 100% view on a narrow container shows the whole page width. Preserve that with the default `fitWidthAtDefaultScale: true` (a better name is welcome). It applies only when `scale === defaultScale`, using a tolerance-based comparison.

## KI-16 — Zoom float drift

- **Verified:** Ten +0.05 steps from 1.0 give `1.5000000000000004`.
- **Fix:** Store zoom internally as an integer percent, or round after every step (`Math.round(x * 100) / 100`). Compare with a tolerance (`Math.abs(a - b) < 1e-6`). Emit rounded values through `onScaleChange`.

## KI-17 — Zoom UX

- **Opt-in:** `zoomLevels?: number[]` (preset ladder; the buttons step between presets), `fitMode?: 'none' | 'width' | 'page'`, a reset-to-100% action (double-click the zoom label, or a menu), and Ctrl/⌘ + wheel and pinch zoom anchored at the pointer.
- **Default stays:** 5% steps and the `[0.25, 5]` clamp.

## KI-18 — Host-app coupling to remove

| Original | New package |
|----------|-------------|
| `useAuthStore().purgeStoreData()` + `location.replace('/auth/sign-in')` on 401 | `onHttpError(response)` callback |
| Default file name `'treatment-report.pdf'` | Derived name, else `'document.pdf'` |
| `theme.palette.customColors.grey1100` | CSS variable `--rpv-toolbar-bg` (default `#54646E`) |
| MUI `useMediaQuery(theme.breakpoints.down('md'))`, md = 960 | `compactBreakpoint` prop (default `960`), own `matchMedia` hook |
| MUI components and icons | Own markup, CSS, and inline SVG icons |
| `window.pdfjsLib` global typed `any` | Typed `pdfjs-dist` import |

## KI-19 — Runtime CDN script injection

- **Problems:** It needs `script-src` to allow three third-party CDNs (a CSP burden), it is a supply-chain risk (there is no SRI), the global is untyped, and the timeout logic has quirks. StrictMode clears the timeout. If the timeout fires while a slower CDN is still trying, the error remains even after a later CDN succeeds. The redundant `waitForPdfJs` poll is left over from an earlier design.
- **Fix:** `pdfjs-dist` is a peer dependency, loaded with `import()` through one memoized loader. Consumers can inject their own loader (e.g. the legacy build) via `configurePdfJs({ loader })`. The worker URL comes from configuration (03 §6).

## KI-20 — Standard fonts

- PDFs that reference the 14 standard fonts without embedding them need `standardFontDataUrl`, or PDF.js falls back to system fonts and logs warnings. Pass `standardFontDataUrl` alongside `cMapUrl` (03 §6).

## KI-21 — No text or annotation layers

- **Opt-in:**
  - `textLayer` renders a selectable, transparent text layer using PDF.js `TextLayer`. It enables copy and find, and makes text available to assistive technology.
  - `annotationLayer` renders clickable links. Internal links navigate pages, and external links open with `rel="noopener noreferrer"`.
  - `search` provides find-in-document with match highlighting. It builds on the text layer.

## KI-22 — Accessibility

- **Fix by default:**
  - Toolbar has `role="toolbar"`, an `aria-label` and roving tab index.
  - The page label is `aria-live="polite"`.
  - The canvas has `role="img"` and `aria-label="Page X of N"`.
  - Visible focus rings.
  - Disabled buttons use `disabled` (not just styling).
  - Keyboard shortcuts work when the viewer has focus: ←/→ and PageUp/PageDown change pages, Home/End go to the first/last page, `+`/`-` zoom, `0` resets zoom, `r` rotates, `f` toggles fullscreen.
  - Minimum 24×24px targets (the original is ≈34px).
  - WCAG AA contrast (white on `#54646E` is ≈6:1).
- The `keyboardShortcuts` prop (default `true`) lets consumers disable shortcuts.

## KI-23 — Password-protected PDFs

- **Opt-in:** a `password` prop, plus a built-in password prompt (`onPassword` of the loading task) that shows `PASSWORD_REQUIRED` / `INCORRECT_PASSWORD` errors and a form. `renderPasswordPrompt` customizes it.

## KI-24 — Navigation limitations

- **Opt-in:**
  - A page-number input in the page group.
  - `layout: 'single' | 'continuous'`. `'single'` is parity. `'continuous'` is vertical scroll with virtualization, rendering only visible pages ±1 with an `IntersectionObserver`.
  - A thumbnails sidebar.
  - Deep link sync: the `#page=N` hash, off by default.

## KI-25 — Dead or redundant code (don't port)

- The duplicate 401 check inside `!response.ok`.
- The `fetchError.response.status === 401` branch (native fetch never produces it).
- `waitForPdfJs` polling.
- `initialPageSetRef` echoing the same page back (replaced by KI-08 logic).
- `useMemo` wrapping toolbar JSX (use small memoized components instead).
- `isLoading` initial `true` with an empty source. Use a proper status enum: `idle | loading | ready | error`.

## KI-26 — Canvas size limits

- Browsers cap canvas size. iOS Safari caps a canvas at about 16.7M px (4096×4096), and desktop limits are larger but still finite. With HiDPI, a Letter page at 500% on a 3× screen would need ≈109M px.
- **Fix:** Cap `outputScale` so that `width * height * outputScale² ≤ maxCanvasPixels` (default `16_777_216`, configurable). When capped, the CSS size stays correct and resolution degrades gracefully.

## KI-27 — i18n

- **Fix:** A `labels` prop with every user-visible string and aria-label. The defaults are the original English strings exactly (see 03 §4.5). Number formatting uses `Intl.NumberFormat` with an optional `locale`.
