import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // Hold Ctrl (⌘ on macOS) and scroll, or pinch on a trackpad, over the page.
  return <PdfViewer source="/samples/letter-3pages.pdf" wheelZoom zoomReset />;
}
