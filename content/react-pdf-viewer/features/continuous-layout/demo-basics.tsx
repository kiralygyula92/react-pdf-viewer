import { PdfViewer } from '@kingtech/react-pdf-viewer';

export default function Demo() {
  return <PdfViewer source="/samples/multipage.pdf" layout="continuous" />;
}
