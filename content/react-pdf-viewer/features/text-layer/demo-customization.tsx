import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

const style = { '--rpv-selection-bg': 'rgba(16, 185, 129, 0.35)' } as CSSProperties;

export default function Demo() {
  return <PdfViewer source="/samples/non-embedded-fonts.pdf" textLayer style={style} />;
}
