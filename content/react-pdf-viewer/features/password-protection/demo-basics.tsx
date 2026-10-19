import { PdfViewer } from '@kingtech/react-pdf-viewer';

export default function Demo() {
  // The password for this sample is: demo
  return <PdfViewer source="/samples/password.pdf" passwordPrompt />;
}
