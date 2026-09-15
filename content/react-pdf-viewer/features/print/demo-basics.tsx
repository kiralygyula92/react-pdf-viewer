import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // Print renders every page into a hidden iframe, then opens the print dialog.
  return <PdfViewer source="/samples/multipage.pdf" />;
}
