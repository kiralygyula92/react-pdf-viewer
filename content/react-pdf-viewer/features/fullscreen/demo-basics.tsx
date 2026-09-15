import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // The fullscreen button uses the browser Fullscreen API; Esc leaves it.
  return <PdfViewer source="/samples/letter-3pages.pdf" />;
}
