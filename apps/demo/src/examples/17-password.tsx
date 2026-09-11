import { PdfViewer } from '@your-scope/react-pdf-viewer';
import { sampleUrl } from '../samples';

export const meta = {
  title: '17. Password prompt',
  description:
    'passwordPrompt asks for the password of encrypted documents (here: demo) and asks again after a wrong one. renderPasswordPrompt replaces the form.',
};

export default function PasswordExample() {
  return <PdfViewer source={sampleUrl('password.pdf')} passwordPrompt />;
}
