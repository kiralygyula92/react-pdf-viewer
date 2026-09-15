import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';
import { sampleUrl } from '../samples';

export const meta = {
  title: '10. Theming',
  description:
    'The dark preset (className="rpv-theme-dark", or "rpv-theme-auto" to follow the OS) and custom CSS variables set on a wrapper.',
};

const custom = {
  '--rpv-toolbar-bg': '#4c1d95',
  '--rpv-accent': '#7c3aed',
  '--rpv-toolbar-radius': '999px',
  '--rpv-page-radius': '12px',
  '--rpv-page-border': '1px solid #c4b5fd',
} as CSSProperties;

export default function ThemingExample() {
  return (
    <div className="demo-grid-2">
      <div className="demo-dark-surface">
        <p>Dark preset</p>
        <PdfViewer className="rpv-theme-dark" source={sampleUrl('letter-3pages.pdf')} />
      </div>
      <div style={custom}>
        <p>Custom variables</p>
        <PdfViewer source={sampleUrl('letter-3pages.pdf')} />
      </div>
    </div>
  );
}
