# 05 — Implementation Plan, Parity Matrix and Definition of Done

Work through the milestones in order. At the end of each one, run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` (plus `pnpm e2e` from M4 onward). Report which acceptance criteria (AC) pass, then stop for review.

---

## 1. Milestones

### M0 — Scaffold

Tasks
- pnpm workspace with `packages/react-pdf-viewer` and `apps/demo`, and a strict `tsconfig.base.json`.
- ESLint flat config (`typescript-eslint`, `react-hooks`, `jsx-a11y`) and Prettier.
- Vitest + Testing Library + jsdom in the package; Playwright in the demo.
- Vite library mode + `vite-plugin-dts`. `react`, `react-dom` and `pdfjs-dist` are externals. CSS is emitted as `dist/styles.css`.
- Changesets, `publint`, `@arethetypeswrong/cli` and `size-limit` scripts.
- GitHub Actions CI: install → lint → typecheck → unit → build → package QA → e2e.
- Pin `pdfjs-dist` to the current stable major (check with `npm view pdfjs-dist version`; must be ≥ 4.2.67).

AC
- [ ] `pnpm install && pnpm build` succeeds from a clean clone.
- [ ] CI is green on an empty-but-wired library export and a demo "hello" page.
- [ ] `publint` and `attw --pack` pass on the empty package.

### M1 — Core engine (headless)

Tasks
- `core/pdfjs.ts`: `configurePdfJs`, the memoized lazy loader, worker and asset defaults (03 §6), and `isEvalSupported: false`.
- `core/loadSource.ts`: every source type becomes bytes, using `AbortSignal`, `requestInit`, `fetcher`, `onHttpError` and `getHttpErrorMessage` (the default reproduces the original ProblemDetails logic).
- `core/errors.ts`: `PdfViewerError`, and mapping of PDF.js exceptions to codes.
- `core/scale.ts`: clamp, step, round and tolerance helpers; zoom-level ladder stepping.
- `hooks/usePdfDocument.ts`: status machine `idle → loading → ready | error`, load ids, abort, `destroy()` of old docs, and `reload()`.
- `hooks/usePageRenderer.ts` + `PdfPageCanvas`: RenderTask cancellation, burst coalescing, double buffering, HiDPI, the pixel cap, intrinsic rotation, and a DPR-change listener.
- `hooks/useControllableState.ts` with the dev warning for controlled↔uncontrolled switches.

AC
- [ ] Unit tests (with mocked `pdfjs-dist`) cover every item in the **Engine** section of the parity matrix (§3).
- [ ] No `any` in `src/` (lint rule enforced).
- [ ] A test proves stale loads can't overwrite newer ones (KI-07).
- [ ] A test proves ten rapid zoom changes produce exactly one completed render and zero errors (KI-02).

### M2 — Parity UI

Tasks
- `PdfViewer` composed from the M1 pieces, plus `Toolbar`, the three groups, `LoadingView`, `ErrorView` (with Retry) and the empty view.
- `styles/pdf-viewer.css` with every CSS variable from 03 §7, mode selectors via data attributes, safe centering, and `@layer rpv`.
- Inline SVG icons: ZoomOut, ZoomIn, NavigateBefore, NavigateNext, Fullscreen, FullscreenExit, RotateRight, Download and Print (Material Icons paths).
- Compact mode through `compactBreakpoint` (960), with rotate and print hidden in compact inline mode.
- `labels` with the original English defaults; `locale` for number formatting.
- Imperative `ref` API and `renderToolbar` / `renderError` / `renderLoading` / `renderEmpty` slots.
- `compat/CustomPdfViewer.tsx` (03 §9).

AC
- [ ] Every **UI** and **Layout** row in the parity matrix passes.
- [ ] With default props, the DOM order, aria-labels and computed styles (colors, sizes, spacing) match 01 §7–8.
- [ ] `CustomPdfViewer` from `/compat` accepts the original props verbatim and type-checks against the original `CustomPdfViewerProps`.

### M3 — Default-on fixes

Implement and test every *Fix by default* item in 02 that M1/M2 didn't already cover: KI-08, KI-09, KI-11, KI-12 (render print), KI-13 (icon toggle plus `native`/`overlay` modes), KI-14, KI-15, KI-20, KI-22 (a11y and keyboard), KI-26 and KI-27.

AC
- [ ] Each KI has at least one named test (`it('KI-12: prints via hidden iframe', …)`).
- [ ] axe-core reports zero violations on the default viewer in all four modes.

### M4 — Demo app

Implement [04-demo-app-spec.md](04-demo-app-spec.md) in full, including the sample generator, parity harness and deployment workflow.

AC
- [ ] Every checkbox in 04 §5.
- [ ] Playwright suites exist: `navigation.spec`, `zoom.spec`, `rotation.spec`, `fullscreen.spec`, `download.spec` (using the download event), `print.spec` (the iframe is created and `print` is called; stub `window.print`), `errors.spec`, `a11y.spec` and `parity.visual.spec`.

### M5 — Opt-in improvements

In priority order: page-number input → `zoomLevels` + reset + fit modes → Ctrl-wheel/pinch zoom → text layer → annotation layer (links) → password prompt → continuous layout with virtualization → thumbnails → search → dark preset. Each feature is off by default, has a playground control, has an example, and has tests.

AC
- [ ] With all opt-ins off, parity visual tests are unchanged.
- [ ] The continuous layout with `multipage.pdf` (40 pages) keeps at most visible pages +2 canvases alive (asserted in e2e).
- [ ] Size budget still met (text and annotation layer code is lazy-loaded if needed to stay under budget).

### M6 — Release readiness

Tasks
- Complete the package README (03 §10), `NOTICE`, `LICENSE` (the owner picks the license), `CHANGELOG` via Changesets.
- `npm pack` dry run. Install the tarball into a fresh Vite app and a fresh Next.js App Router app (in CI, as "consumer smoke tests"), verifying import, SSR and worker setup.
- API review: remove anything not in 03 §4 or documented as experimental.

AC
- [ ] Consumer smoke tests pass for Vite and Next.js.
- [ ] `publint`, `attw` and `size-limit` pass.
- [ ] Version `0.1.0` is ready. **Do not publish**; the owner publishes.

---

## 2. Test strategy

| Layer | Tooling | Scope |
|-------|---------|-------|
| Unit | Vitest + jsdom | Pure helpers (`scale`, `fileName`, error mapping), hooks (`renderHook`), components against a **mocked `pdfjs-dist`** (fake `getDocument` / `getPage` / `render` returning controllable promises; a fake `RenderTask` with `cancel()`) |
| Integration | Vitest + real `pdfjs-dist` in Node for document parsing (no canvas) | Source loading, page counts, intrinsic rotation read |
| E2E | Playwright (Chromium, Firefox, WebKit) against `demo preview` | Real rendering, downloads, print stub, keyboard, fullscreen |
| Visual | Playwright `toHaveScreenshot` on `/parity` | Parity layouts at desktop and mobile viewports |
| A11y | `@axe-core/playwright` | Every demo route and parity state |

Mock-quality rule: the `pdfjs-dist` mock must match the real call signatures of the pinned version. A type-level test imports real types and checks that the mock `satisfies` them.

---

## 3. Parity matrix

Every row needs an automated test. "Original" is the behavior to reproduce; "New" is filled in only where the new package deliberately differs (02).

### Engine

| ID | Behavior | Original | New |
|----|----------|----------|-----|
| E-01 | URL source is fetched by the viewer, then bytes are passed to PDF.js | yes | Same, plus Blob/ArrayBuffer/Uint8Array sources |
| E-02 | Non-2xx error message: `detail` → `title` → JSON string → `Failed to fetch PDF: {status} {statusText}` | yes | Same default, overridable |
| E-03 | 401 handling | purge auth + redirect | `onHttpError` returns true → no error UI |
| E-04 | Empty source → empty state, `0 / 0` | yes (with a spinner flash) | No spinner flash |
| E-05 | Source change reloads | yes | Plus abort, destroy, page reset/clamp |
| E-06 | Render page clamped to `[1, numPages]` | yes | Label clamped too, `onPageChange` emitted |
| E-07 | `getDocument` uses cMaps | yes | Plus `standardFontDataUrl`, `isEvalSupported: false` |
| E-08 | Rotation applied to viewport | Overrides intrinsic | Added to intrinsic |
| E-09 | Rendering | 1× canvas, no cancel | HiDPI, cancel, capped |
| E-10 | After load, current page is re-reported via `onPageChange` | yes | Only when clamping changes it |

### UI

| ID | Behavior | Original |
|----|----------|----------|
| U-01 | Toolbar is below the viewport | yes |
| U-02 | Control order: ZoomOut, %, ZoomIn · Prev, `n / N`, Next · Fullscreen, Rotate, Download, Print | yes |
| U-03 | aria-labels exactly as 01 §7 | yes |
| U-04 | Zoom ±5%, clamped 25–500%, buttons disabled at the bounds | yes |
| U-05 | Zoom label `Math.round(scale*100)%` | yes |
| U-06 | Prev disabled on page 1 or with no doc; Next disabled on the last page or with no doc | yes |
| U-07 | Rotate cycles 0→90→180→270→0 | yes |
| U-08 | Fullscreen button toggles; label switches Enter/Exit | yes (+ icon toggles in new) |
| U-09 | Rotate and Print hidden when compact && !fullscreen | yes |
| U-10 | Download saves with `fileName` | yes (new: from loaded bytes) |
| U-11 | Loading: centered 40px spinner + "Loading PDF..." with the toolbar visible | yes |
| U-12 | Error: red Alert with the message in a 400px-high centered area | yes (new: + Retry, toolbar stays) |
| U-13 | Zoom and rotate work while loading or with no document | yes |

### Layout

| ID | Behavior | Original |
|----|----------|----------|
| L-01 | Desktop inline viewport: max-w 650, min-h 712, max-h 800, padding 0 | yes |
| L-02 | Desktop fullscreen viewport: max-w 100%, max-h 100%, padding 32; root height 100vh | yes |
| L-03 | Compact inline: max-w 100%, min-h 400, max-h 100%, padding 16 | yes |
| L-04 | Compact fullscreen: padding 32 | yes |
| L-05 | Toolbar: bg #54646E, white fg, radius 8, min-h 48, px 16, gap 8, max-w 482 inline / 100% fullscreen, mb 40 | yes |
| L-06 | Viewport mb 64 | yes |
| L-07 | Page: white bg, 1px #ddd border, radius 4, shadow `0 2px 8px rgba(0,0,0,.1)` | yes |
| L-08 | At 100% the page fits the container width | yes (intent) |
| L-09 | At >100% the page shows at true size and the container scrolls | yes |
| L-10 | Page label min-width 80 desktop / 40 compact; zoom label min-width 40; 14px/600 | yes |
| L-11 | Compact breakpoint: < 960px viewport width | yes |
| L-12 | Centering never clips the left overflow | **no** (fixed in new) |

---

## 4. Definition of done (whole project)

- [ ] All milestone ACs pass in CI on Chromium, Firefox and WebKit.
- [ ] Parity matrix fully automated and green.
- [ ] Every 02 item is either fixed with a named test, or implemented as opt-in with a test and a demo control.
- [ ] Package README complete; every public export documented with TSDoc.
- [ ] Demo deployed as a static site from `main`.
- [ ] Consumer smoke tests (Vite, Next.js) green.
- [ ] No host-app-specific code, strings or URLs anywhere in `packages/`.
