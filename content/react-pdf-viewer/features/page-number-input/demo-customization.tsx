import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

const style = {
  '--rpv-toolbar-bg': '#f1f5f9',
  '--rpv-toolbar-fg': '#0f172a',
  '--rpv-button-hover-bg': 'rgba(15, 23, 42, 0.08)',
  '--rpv-button-disabled-fg': 'rgba(15, 23, 42, 0.35)',
  '--rpv-focus-ring': '2px solid #0f172a',
  '--rpv-page-input-bg': '#ffffff',
  '--rpv-page-input-border': '#94a3b8',
} as CSSProperties;

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/multipage.pdf"
      pageInput
      labels={{ pageInput: 'Go to page' }}
      style={style}
    />
  );
}
