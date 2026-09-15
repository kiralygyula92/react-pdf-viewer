import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

const style = {
  '--rpv-toolbar-bg': '#4c1d95',
  '--rpv-toolbar-radius': '999px',
  '--rpv-toolbar-padding-x': '24px',
  '--rpv-button-hover-bg': 'rgba(255, 255, 255, 0.18)',
  '--rpv-menu-bg': '#faf5ff',
} as CSSProperties;

export default function Demo() {
  return <PdfViewer source="/samples/letter-3pages.pdf" style={style} />;
}
