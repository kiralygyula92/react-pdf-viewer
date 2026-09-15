import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { sampleUrl } from '../samples';

export const meta = {
  title: '15. Text layer and search',
  description:
    'search adds a find bar (Ctrl/⌘ + F inside the viewer) that highlights every match; Enter and Shift + Enter step through them. Text is selectable and readable by assistive technology.',
};

export default function SearchExample() {
  return <PdfViewer source={sampleUrl('multipage.pdf')} search pageInput />;
}
