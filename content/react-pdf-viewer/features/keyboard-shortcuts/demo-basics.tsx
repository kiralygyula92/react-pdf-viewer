import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // Click the page (or Tab to it), then try ← →, + − 0, r and f.
  return <PdfViewer source="/samples/multipage.pdf" />;
}
