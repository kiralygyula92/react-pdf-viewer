---
'@kiralygyula92/react-pdf-viewer': patch
---

Keep memory flat in long documents: a page that unmounts (scrolled out of the continuous layout,
or a thumbnail) now releases the page's cached resources, and thumbnails render only near the
visible part of the list instead of keeping a canvas for every page ever shown. A released
thumbnail's placeholder keeps its size, so the list never shifts.

`printMode="open-url"` now opens a source directly only when it is an http(s) URL loaded without
`fetcher` or `requestInit`. Any other source opens the bytes already loaded, so authenticated
documents no longer open without their headers and other URL schemes are never opened.

Also: a link to a destination that cannot be resolved is ignored instead of raising an unhandled
promise rejection, and `setScale` ignores `NaN` and infinite values.
