---
'@your-scope/react-pdf-viewer': minor
---

Responsive toolbar: always a single row; when it does not fit, the actions (then the zoom
controls) collapse into an accessible "More actions" menu instead of wrapping or clipping. New
`moreActions` label and `PdfToolbar` `menuPlacement` prop. The page-number input and the
zoom-reset button are restyled and guarded against host-wide form styles, and opt-in controls get
spacing between the toolbar groups.
