import { PdfViewer } from '@your-scope/react-pdf-viewer';
import { sampleUrl } from '../samples';

export const meta = {
  title: '4. Native fullscreen',
  description:
    'fullscreenMode="native" uses the Fullscreen API on the viewer (Esc exits). Where element fullscreen is unavailable, such as iPhone Safari, it falls back to an overlay.',
};

export default function NativeFullscreenExample() {
  return <PdfViewer source={sampleUrl('mixed-sizes.pdf')} fullscreenMode="native" />;
}
