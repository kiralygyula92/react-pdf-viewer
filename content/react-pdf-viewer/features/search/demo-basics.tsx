import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // Type in the search field (or press Ctrl/⌘ + F inside the viewer); Enter steps through matches.
  return <PdfViewer source="/samples/multipage.pdf" search />;
}
