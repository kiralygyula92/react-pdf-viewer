import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

// --rpv-accent colours the keyboard focus outline of link areas.
const style = { '--rpv-accent': '#be185d' } as CSSProperties;

export default function Demo() {
  return <PdfViewer source="/samples/links.pdf" annotationLayer textLayer style={style} />;
}
