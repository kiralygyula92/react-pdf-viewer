import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // A deliberately tiny budget (250,000 pixels): the page keeps its size but renders at a lower
  // resolution, so it looks soft instead of failing on memory-constrained devices.
  return <PdfViewer source="/samples/letter-3pages.pdf" maxCanvasPixels={250_000} />;
}
