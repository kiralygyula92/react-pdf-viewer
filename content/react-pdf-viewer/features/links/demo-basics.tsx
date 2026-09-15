import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // Internal links jump to their page; external links open in a new tab.
  return <PdfViewer source="/samples/links.pdf" annotationLayer />;
}
