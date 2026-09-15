import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

const style = {
  '--rpv-page-bg': '#fffdf7',
  '--rpv-page-border': '1px solid #e7e5e4',
  '--rpv-page-radius': '2px',
  '--rpv-page-shadow': '0 1px 2px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.08)',
} as CSSProperties;

export default function Demo() {
  return <PdfViewer source="/samples/letter-3pages.pdf" style={style} />;
}
