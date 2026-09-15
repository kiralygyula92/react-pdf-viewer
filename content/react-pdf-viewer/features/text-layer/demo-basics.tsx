import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // Select text on the page and copy it.
  return <PdfViewer source="/samples/multipage.pdf" textLayer />;
}
