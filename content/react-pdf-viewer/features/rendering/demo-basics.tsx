import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // Zoom in quickly with the + button: each change cancels the previous render, and the old
  // page stays visible until the new one is ready.
  return <PdfViewer source="/samples/letter-3pages.pdf" defaultScale={2} zoomReset />;
}
