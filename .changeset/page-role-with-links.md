---
'@kiralygyula92/react-pdf-viewer': patch
---

Pages rendered with `annotationLayer` are now exposed as a `group` instead of an `img`, so their
links are no longer nested inside an image (axe `nested-interactive`).
