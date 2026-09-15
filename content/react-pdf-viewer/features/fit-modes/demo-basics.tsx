import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // At the default scale the page fills the available width.
  return <PdfViewer source="/samples/letter-3pages.pdf" fitMode="width" />;
}
