import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3];

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/letter-3pages.pdf"
      zoomLevels={ZOOM_LEVELS}
      minScale={0.5}
      maxScale={3}
      zoomReset
    />
  );
}
