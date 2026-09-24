---
'@kiralygyula92/react-pdf-viewer': major
---

First stable release of `PdfViewer`, an accessible, themeable React PDF viewer built on
`pdfjs-dist`. From this release on, the public API (components, hooks, props, `PdfViewerApi`,
labels, CSS classes and CSS variables) follows semantic versioning.

- Loads URLs, `URL` objects, `ArrayBuffer`, `Uint8Array`, `Blob` and `File` sources, with custom
  `fetch` options, a replaceable fetcher, HTTP error hooks and typed `PdfViewerError`s with retry.
- Controlled or uncontrolled page, scale, rotation and fullscreen (`x` / `defaultX` / `onXChange`),
  plus an imperative `PdfViewerApi` through `ref`.
- Cancellable, HiDPI, pixel-capped rendering that respects each page's intrinsic rotation. Memory
  stays flat in long documents: pages and thumbnails far from view release their canvases and
  cached page resources.
- A single-row responsive toolbar that collapses actions into a "More actions" menu, keyboard
  shortcuts, WAI-ARIA toolbar and menu semantics, and native, overlay or controlled fullscreen.
- Download, and printing through a hidden frame with every page on a sheet of its own size, or
  `printMode="open-url"` to hand the document to the browser's own viewer.
- Opt-in features: continuous layout, thumbnails, text layer, links, search, page-number input,
  zoom presets and reset, fit modes, Ctrl/⌘ + wheel zoom and a password prompt.
- Label overrides with locale-aware number formatting, 50+ CSS variables and dark / auto presets.
- Headless building blocks: `usePdfDocument`, `PdfPageCanvas`, `PdfToolbar` and
  `useControllableState`.
- Secure by default: `isEvalSupported: false`, a `pdfjs-dist` peer range that excludes
  CVE-2024-4367, external links opened with `rel="noopener noreferrer"`, no script injection, and
  SSR-safe rendering.
