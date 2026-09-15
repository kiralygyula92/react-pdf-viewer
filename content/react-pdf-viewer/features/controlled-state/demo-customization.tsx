import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // Uncontrolled, but opening where you choose. `defaultScale` is also the reset-zoom target.
  return (
    <PdfViewer
      source="/samples/multipage.pdf"
      defaultPage={5}
      defaultScale={1.25}
      defaultRotation={90}
      zoomReset
    />
  );
}
