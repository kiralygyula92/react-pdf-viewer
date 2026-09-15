import { PdfViewer, type PdfJsDocumentOptions } from '@kiralygyula92/react-pdf-viewer';

// Per-instance getDocument options: silence PDF.js console warnings for this viewer only.
const pdfjsOptions: PdfJsDocumentOptions = { verbosity: 0 };

export default function Demo() {
  return <PdfViewer source="/samples/mixed-sizes.pdf" pdfjsOptions={pdfjsOptions} />;
}
