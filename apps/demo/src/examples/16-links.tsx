import { PdfViewer } from '@your-scope/react-pdf-viewer';
import { sampleUrl } from '../samples';

export const meta = {
  title: '16. Links',
  description:
    'annotationLayer makes links clickable: internal links go to their page, external links open in a new tab with rel="noopener noreferrer".',
};

export default function LinksExample() {
  return <PdfViewer source={sampleUrl('links.pdf')} annotationLayer textLayer />;
}
