---
'@kiralygyula92/react-pdf-viewer': minor
---

Initial release of `PdfViewer`, an accessible, themeable React PDF viewer built on `pdfjs-dist`.

- Loads URLs, `URL` objects, `ArrayBuffer`, `Uint8Array`, `Blob` and `File` sources, with custom
  `fetch` options, a replaceable fetcher, HTTP error hooks and typed `PdfViewerError`s with retry.
- Controlled or uncontrolled page, scale, rotation and fullscreen (`x` / `defaultX` / `onXChange`),
  plus an imperative `PdfViewerApi` through `ref`.
- Cancellable, HiDPI, pixel-capped rendering that respects each page's intrinsic rotation.
- A single-row responsive toolbar that collapses actions into a "More actions" menu, keyboard
  shortcuts, WAI-ARIA toolbar and menu semantics, and native, overlay or controlled fullscreen.
- Opt-in features: continuous layout, thumbnails, text layer, links, search, page-number input,
  zoom presets and reset, fit modes, Ctrl/⌘ + wheel zoom and a password prompt.
- Label overrides with locale-aware number formatting, 50+ CSS variables and dark / auto presets.
- Headless building blocks: `usePdfDocument`, `PdfPageCanvas`, `PdfToolbar` and
  `useControllableState`.
