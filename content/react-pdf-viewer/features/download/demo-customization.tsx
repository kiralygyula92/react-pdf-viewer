import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/letter-3pages.pdf"
      fileName="quarterly-summary.pdf"
      labels={{ download: 'Save a copy' }}
      toolbar={{ actions: ['zoomOut', 'zoomLevel', 'zoomIn', 'download'] }}
    />
  );
}
