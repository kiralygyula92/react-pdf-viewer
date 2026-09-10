# 04 — Demo Application Specification

`apps/demo` is a static site that showcases the library and serves as the e2e and visual-parity test bed. It consumes the package **through its public entry points only** (`@your-scope/react-pdf-viewer` and `/styles.css`) via the workspace link, exactly as a real consumer would.

---

## 1. Stack

- Vite + React + TypeScript, built to static files (`vite build`), with no server runtime.
- React Router in hash mode, or configured `base`, so it works on GitHub Pages or any static host.
- No UI kit required. Use plain CSS for the demo chrome, and keep it visually distinct from the viewer so the viewer's own styles are clearly visible.
- `pdfjs-dist` worker, cmaps and standard fonts are **self-hosted** via `?url` import and `vite-plugin-static-copy`. This demonstrates the recommended production setup (03 §6.2).

---

## 2. Routes and pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | **Playground** | The main showcase: source picker, viewer, prop controls, event log |
| `/view?src=<url>&page=&zoom=&rotation=` | **Standalone viewer** | Full-page viewer for any URL. It is the "URL viewing system", with deep links. |
| `/examples` | **Examples gallery** | Small focused examples, each with a live viewer and its source code |
| `/parity` | **Parity harness** | Fixed configurations that mirror the original's four layout states, used by Playwright visual tests |

### 2.1 Playground (`/`)

Layout: a left sidebar (collapsible at < 960px) with **Source** and **Options** panels, the viewer in the center, and an **Event log** drawer at the bottom.

**Source panel** (three tabs):
1. **Samples:** a list of bundled PDFs from `public/samples/manifest.json` (title, pages, notes). Clicking one loads it.
2. **URL:** a text input with an Open button. It validates the URL and shows an inline CORS explainer when loading fails with `NETWORK_ERROR`: *"The server must send `Access-Control-Allow-Origin`…"*. It also offers "Open in standalone viewer", which links to `/view?src=…`.
3. **File:** file picker plus drag-and-drop anywhere on the page. It accepts `.pdf` / `application/pdf` and passes the `File` (Blob) straight to `source`, so nothing is uploaded. The selected file name is shown.

**Options panel** (each control maps 1:1 to a prop and updates live):
- Controlled vs uncontrolled toggle. In controlled mode the panel shows page, scale and rotation inputs bound to the viewer.
- `layout`, `toolbar.position`, `fullscreenMode`, `fitMode`, `zoomLevels` (preset on/off), `textLayer`, `annotationLayer`, `keyboardShortcuts`, `printMode`, `compactBreakpoint`.
- Theme: default / dark / custom (color pickers for `--rpv-toolbar-bg`, `--rpv-accent`).
- Locale / labels: English / a second language (e.g. Hungarian or German) to prove `labels` works.
- Container width slider (320–1400px) to demonstrate responsive and compact behavior without resizing the window.
- "Reset to parity defaults" button.

**Event log:** timestamped entries for `onDocumentLoad`, `onPageChange`, `onScaleChange`, `onRotationChange`, `onFullscreenChange`, `onPageRender` (with duration), and `onError` (code, status, message). There is a Clear button.

**Imperative API panel:** buttons that call `ref.current.goToPage(n)`, `zoomIn()`, `rotate('ccw')`, `download()`, `print()`, `reload()`.

### 2.2 Standalone viewer (`/view`)

- Reads `src`, `page`, `zoom` (percent) and `rotation` from the query string, and keeps them in sync with viewer state (`history.replaceState`), so the URL is always shareable.
- With no `src`, it shows a small form (URL input + file drop).
- Full-height layout with the viewer filling the page and toolbar at the bottom.
- Handles errors with the default error view, which includes Retry.

### 2.3 Examples gallery (`/examples`)

Each example is a card with a live viewer, a short description, and a collapsible source listing, imported as raw text with `?raw` so the code shown is the code running.

| # | Example | Demonstrates |
|---|---------|--------------|
| 1 | Basic | `<PdfViewer source="/samples/multipage.pdf" />` |
| 2 | Controlled state | Parent-owned page/scale/rotation with external buttons |
| 3 | Original-style fullscreen dialog | `fullscreenMode="controlled"` with the parent rendering a fixed overlay. This mirrors the host app pattern (01 §9). |
| 4 | Native fullscreen | `fullscreenMode="native"` |
| 5 | From File/Blob | File input → `source={file}` |
| 6 | From ArrayBuffer | `fetch` → `arrayBuffer()` → `source` |
| 7 | Authenticated fetch | `fetcher` adding an `Authorization` header (against a mocked endpoint, or a Service Worker that rejects requests without the header) plus `onHttpError` handling 401 |
| 8 | Custom toolbar | `renderToolbar(api)` with a completely different UI |
| 9 | Headless | `usePdfDocument` + `PdfPageCanvas` building a thumbnail strip |
| 10 | Theming | CSS variables, dark preset |
| 11 | i18n | `labels` + `locale` |
| 12 | Error states | 404 URL, non-PDF file, CORS-blocked URL, password-protected file, each showing the error view and the `onError` payload |
| 13 | Compat wrapper | `CustomPdfViewer` from `/compat` with original props |

### 2.4 Parity harness (`/parity`)

Deterministic pages for Playwright. There are no animations, a fixed sample PDF (`letter-3pages.pdf`), and query flags select the state:

- `/parity?mode=inline` and `/parity?mode=fullscreen`
- `&zoom=100|150|25` and `&rotation=0|90`
- `&state=loading|error|empty` (a loading state held with a never-resolving `fetcher`; an error state with a 500 ProblemDetails response from a mocked `fetcher`)

Playwright runs these at desktop (1280×800) and mobile (390×844) viewports and compares against committed baseline screenshots. The first baselines are reviewed by a human against screenshots of the original, if they were added to `docs/handoff/reference/screenshots/`.

---

## 3. Sample PDFs

Generate the samples with a script (`apps/demo/scripts/generate-samples.ts`, using `pdf-lib`) so every file is license-clean and reproducible. Commit the outputs to `apps/demo/public/samples/` along with a `manifest.json`.

| File | Content | Tests |
|------|---------|-------|
| `letter-3pages.pdf` | 3 US-Letter pages with a large page number and a grid | Navigation, parity screenshots |
| `multipage.pdf` | 40 pages, text-heavy | Continuous scroll, search, perf |
| `mixed-sizes.pdf` | Letter, A4, A3 landscape, and a small receipt size | Fit and centering |
| `intrinsic-rotation.pdf` | A page with `/Rotate 90` | KI-03 fix |
| `links.pdf` | Internal and external links | Annotation layer |
| `non-embedded-fonts.pdf` | Uses standard 14 fonts without embedding | KI-20 fix |
| `password.pdf` | Password `demo` (generate with `qpdf --encrypt` if available; otherwise commit a pre-made file and document how it was made) | KI-23 |
| `not-a-pdf.pdf` | HTML content with a `.pdf` name | `INVALID_PDF` error |

Remote URL presets for the URL tab: include one well-known public PDF that is served with permissive CORS. The PDF.js project's own demo file on its GitHub Pages site is a good candidate. **Verify** that it loads in the browser before listing it. Also include one known CORS-blocked URL to demonstrate the error message.

---

## 4. Deployment

- `pnpm --filter demo build` produces `apps/demo/dist`. It must work when served from a sub-path. Set `base` from the `DEMO_BASE` env var and use hash routing or a `404.html` fallback.
- A GitHub Actions workflow deploys to GitHub Pages on push to `main` (the owner enables Pages).
- `pnpm --filter demo preview` serves the production build locally for e2e.

---

## 5. Acceptance criteria

- [ ] All three source types (sample, URL, file drag-drop) work in Chrome, Firefox and Safari.
- [ ] `/view?src=<cors-enabled-url>&page=2&zoom=150` opens on page 2 at 150%, and changing either updates the address bar.
- [ ] Every option in the playground changes the viewer live, with no page reload.
- [ ] The event log shows every callback with correct payloads.
- [ ] Every example renders and its displayed source matches the running code.
- [ ] Parity harness screenshots are stable across three consecutive runs (no flake).
- [ ] The demo is fully keyboard-navigable, and axe reports zero violations on every route.
- [ ] Lighthouse accessibility score ≥ 95 on `/` and `/view`.
- [ ] The static build works from a sub-path.
