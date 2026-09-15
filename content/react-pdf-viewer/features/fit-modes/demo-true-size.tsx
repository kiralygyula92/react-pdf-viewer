import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // Never shrink: 100% is always the page's true size, and wide pages scroll.
  return (
    <PdfViewer source="/samples/mixed-sizes.pdf" defaultPage={3} fitWidthAtDefaultScale={false} />
  );
}
