import {
  configurePdfJs,
  PdfViewer,
  type PdfViewerApi,
  type PdfViewerError,
} from '@your-scope/react-pdf-viewer';
import { CustomPdfViewer } from '@your-scope/react-pdf-viewer/compat';
import '@your-scope/react-pdf-viewer/styles.css';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { StrictMode, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// The README's Vite recipe: a self-hosted worker.
configurePdfJs({ workerSrc });

function App() {
  const viewer = useRef<PdfViewerApi>(null);
  return (
    <>
      <PdfViewer
        ref={viewer}
        source="/sample.pdf"
        fileName="sample.pdf"
        onError={(error: PdfViewerError) => console.error(error.code, error.message)}
      />
      <CustomPdfViewer pdfUrl="" documentName="empty.pdf" />
    </>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
