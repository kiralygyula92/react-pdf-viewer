---
'@your-scope/react-pdf-viewer': minor
---

Initial release of `PdfViewer`: a clean-room re-implementation of the original `CustomPdfViewer` on
`pdfjs-dist` 6 with default-on fixes for rendering races, HiDPI output, intrinsic page rotation,
source-change races, error handling, download, print, fullscreen, accessibility and i18n. Includes
the headless `usePdfDocument` / `PdfPageCanvas` building blocks, `configurePdfJs`, and the
`/compat` drop-in `CustomPdfViewer` wrapper.
