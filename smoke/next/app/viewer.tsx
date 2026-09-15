'use client';

import { configurePdfJs, PdfViewer } from '@kiralygyula92/react-pdf-viewer';

// The README's webpack / Next.js recipe: the bundler emits the worker as an asset.
configurePdfJs({
  workerSrc: new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString(),
});

export function Viewer() {
  return <PdfViewer source="/sample.pdf" fileName="sample.pdf" />;
}
