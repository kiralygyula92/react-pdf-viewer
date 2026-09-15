import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { sampleUrl } from '../samples';

export const meta = {
  title: '18. Continuous layout and thumbnails',
  description:
    'layout="continuous" scrolls through all pages (only the visible pages ±1 are rendered); thumbnails adds a page sidebar. The page indicator follows the scroll position.',
};

export default function ContinuousExample() {
  return <PdfViewer source={sampleUrl('multipage.pdf')} layout="continuous" thumbnails pageInput />;
}
