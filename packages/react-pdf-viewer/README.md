# @kiralygyula92/react-pdf-viewer

[![npm](https://img.shields.io/npm/v/@kiralygyula92/react-pdf-viewer)](https://www.npmjs.com/package/@kiralygyula92/react-pdf-viewer)
[![CI](https://github.com/kiralygyula92/react-pdf-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/kiralygyula92/react-pdf-viewer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Accessible, themeable PDF viewer for React, built on PDF.js.

A complete viewer with a toolbar for zoom, page navigation, fullscreen, rotation, download and
print, plus opt-in continuous scrolling, thumbnails, search, selectable text and links. No UI-kit
dependency, SSR-safe and fully typed.

- **Accessible:** WAI-ARIA toolbar and menu semantics, keyboard shortcuts, live page announcements, checked with axe.
- **Themeable:** plain CSS in a cascade layer, CSS variables, dark and automatic presets.
- **Controlled or uncontrolled:** page, zoom, rotation and fullscreen each follow `x` / `defaultX` / `onXChange`.
- **Production loading:** URLs with custom requests, `File`, `Blob` and bytes, typed errors with retry.
- **Composable:** replace the toolbar, or build your own viewer with `usePdfDocument` and `PdfPageCanvas`.

**[Documentation, live demos and API reference →](https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/)**

## Install

```sh
npm install @kiralygyula92/react-pdf-viewer pdfjs-dist
```

Peer dependencies: `react` and `react-dom` 18 or 19, and `pdfjs-dist` 6. See
[Requirements](https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/getting-started/requirements/)
for the tested versions and browsers.

## Quick start

```tsx
import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import '@kiralygyula92/react-pdf-viewer/styles.css';

export function Report() {
  return <PdfViewer source="/files/report.pdf" />;
}
```

Out of the box, PDF.js's worker and assets load from a CDN pinned to your installed version. For
production, self-host them once at startup (Vite shown):

```ts
import { configurePdfJs } from '@kiralygyula92/react-pdf-viewer';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

configurePdfJs({ workerSrc });
```

Setup guides: [Vite](https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/integrations/vite/),
[Next.js](https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/integrations/nextjs/),
[webpack](https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/integrations/webpack/).

## Documentation

- [Usage](https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/getting-started/usage/): the common props and features.
- [All features](https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/all-features/): one page per capability, each with live demos.
- [Customization](https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/customization/): theming, labels, custom views.
- [API reference](https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/api/): every prop, type, CSS variable and shortcut, generated from the source.
- [Security](https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/guides/security/) and [Accessibility](https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/guides/accessibility/) guides.
- [Changelog](https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/discover-more/changelog/).

## License

[MIT](./LICENSE) © kiralygyula92. Third-party attributions (Material Icons paths, PDF.js) are listed in
[`NOTICE`](./NOTICE).
