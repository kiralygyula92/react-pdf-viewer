import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { sampleUrl } from '../samples';

export const meta = {
  title: '14. Zoom presets, fit and page input',
  description:
    'zoomLevels steps through presets, the zoom label resets zoom, fitMode="width" fills the width, Ctrl/⌘ + wheel or trackpad pinch zooms at the pointer, and the page number is editable.',
};

export default function ZoomAndNavigationExample() {
  return (
    <PdfViewer
      source={sampleUrl('mixed-sizes.pdf')}
      zoomLevels={[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]}
      zoomReset
      fitMode="width"
      wheelZoom
      pageInput
    />
  );
}
