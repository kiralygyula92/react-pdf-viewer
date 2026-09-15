import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

const style = {
  '--rpv-page-gap': '40px',
  '--rpv-page-shadow': '0 12px 32px rgba(15, 23, 42, 0.18)',
  '--rpv-page-radius': '8px',
} as CSSProperties;

export default function Demo() {
  return <PdfViewer source="/samples/mixed-sizes.pdf" layout="continuous" style={style} />;
}
