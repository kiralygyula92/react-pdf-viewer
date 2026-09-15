import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // Page 2 of this sample has an intrinsic /Rotate 90: it opens in landscape.
  return <PdfViewer source="/samples/intrinsic-rotation.pdf" />;
}
