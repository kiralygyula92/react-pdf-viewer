import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // A password your app already knows, for example from the server.
  return <PdfViewer source="/samples/password.pdf" password="demo" />;
}
