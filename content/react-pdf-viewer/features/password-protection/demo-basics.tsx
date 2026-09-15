import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // The password for this sample is: demo
  return <PdfViewer source="/samples/password.pdf" passwordPrompt />;
}
