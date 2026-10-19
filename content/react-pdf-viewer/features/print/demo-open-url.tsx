import { PdfViewer } from '@kingtech/react-pdf-viewer';

export default function Demo() {
  // Opens the PDF in a new tab and leaves printing to the browser's own viewer.
  return <PdfViewer source="/samples/letter-3pages.pdf" printMode="open-url" />;
}
