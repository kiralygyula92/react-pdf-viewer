import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // Pages of different sizes each fit entirely inside the document area.
  return <PdfViewer source="/samples/mixed-sizes.pdf" fitMode="page" />;
}
