import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { sampleUrl } from '../samples';

export const meta = {
  title: '1. Basic',
  description: 'Default props: toolbar below the page, one page at a time, 5% zoom steps.',
};

export default function BasicExample() {
  return <PdfViewer source={sampleUrl('multipage.pdf')} />;
}
