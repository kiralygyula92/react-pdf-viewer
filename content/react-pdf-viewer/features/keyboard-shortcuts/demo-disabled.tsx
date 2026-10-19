import { PdfViewer } from '@kingtech/react-pdf-viewer';

export default function Demo() {
  // Your app owns these keys: the viewer ignores them. The toolbar stays keyboard-operable.
  return <PdfViewer source="/samples/multipage.pdf" keyboardShortcuts={false} />;
}
