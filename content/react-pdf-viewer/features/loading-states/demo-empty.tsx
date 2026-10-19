import { PdfViewer } from '@kingtech/react-pdf-viewer';

export default function Demo() {
  // No source yet: the toolbar shows 0 / 0 with navigation disabled.
  return <PdfViewer source={null} />;
}
