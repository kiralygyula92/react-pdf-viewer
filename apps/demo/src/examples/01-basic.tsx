import { PdfViewer } from '@your-scope/react-pdf-viewer';
import { sampleUrl } from '../samples';

export const meta = {
  title: '1. Basic',
  description:
    'Default props reproduce the original viewer: toolbar below, one page, 5% zoom steps.',
};

export default function BasicExample() {
  return <PdfViewer source={sampleUrl('multipage.pdf')} />;
}
