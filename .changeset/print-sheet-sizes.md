---
'@kiralygyula92/react-pdf-viewer': patch
---

Print each page on a sheet of its own size, so documents that mix page sizes (for example a
letter report with an A3 landscape drawing) print correctly instead of scaling every page onto the
first page's sheet.

Also honour a caller's `requestInit.signal` in browsers without `AbortSignal.any` (Safari before
17.4), where it was previously ignored.
