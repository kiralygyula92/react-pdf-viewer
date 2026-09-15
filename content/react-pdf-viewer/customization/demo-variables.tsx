import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

const theme = {
  '--rpv-toolbar-bg': '#0f172a',
  '--rpv-toolbar-radius': '14px',
  '--rpv-accent': '#6366f1',
  '--rpv-page-radius': '10px',
  '--rpv-page-border': '1px solid #c7d2fe',
  '--rpv-page-shadow': '0 16px 40px rgba(79, 70, 229, 0.18)',
} as CSSProperties;

export default function Demo() {
  return (
    <div style={theme}>
      <PdfViewer source="/samples/letter-3pages.pdf" pageInput />
    </div>
  );
}
