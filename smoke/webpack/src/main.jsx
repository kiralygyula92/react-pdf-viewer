import { configurePdfJs, PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import '@kiralygyula92/react-pdf-viewer/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// The docs' webpack recipe: webpack emits the worker as an asset and returns its URL.
configurePdfJs({
  workerSrc: new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString(),
});

const container = document.createElement('div');
document.body.append(container);

createRoot(container).render(
  <StrictMode>
    <PdfViewer source="/sample.pdf" fileName="sample.pdf" />
  </StrictMode>,
);
