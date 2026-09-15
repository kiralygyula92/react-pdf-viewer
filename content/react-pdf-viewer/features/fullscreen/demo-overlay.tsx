import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // A full-viewport layer inside the page: focus is trapped, the page behind stops scrolling.
  return <PdfViewer source="/samples/letter-3pages.pdf" fullscreenMode="overlay" />;
}
