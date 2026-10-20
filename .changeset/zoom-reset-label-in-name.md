---
'@kingtech/react-pdf-viewer': patch
---

The toolbar's reset-zoom button (`zoomReset`) now starts its accessible name with the zoom level it
shows, for example "100%, Reset zoom" instead of "Reset zoom (100%)", so it meets WCAG 2.5.3 Label
in Name and speech-input users can activate it by saying what they see. The "More actions" menu
item keeps the label "Reset zoom (100%)".
