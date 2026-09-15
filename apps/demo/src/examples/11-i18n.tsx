import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { hungarianLabels } from '../i18n';
import { sampleUrl } from '../samples';

export const meta = {
  title: '11. Labels and locale',
  description:
    'Every visible string and accessible name comes from labels; numbers are formatted for locale (here Hungarian).',
};

export default function I18nExample() {
  return (
    <div lang="hu">
      <PdfViewer
        source={sampleUrl('multipage.pdf')}
        labels={hungarianLabels}
        locale="hu-HU"
        fileName="dokumentum.pdf"
      />
    </div>
  );
}
