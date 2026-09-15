import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // The download button saves the bytes already loaded: no second request.
  return <PdfViewer source="/samples/letter-3pages.pdf" />;
}
