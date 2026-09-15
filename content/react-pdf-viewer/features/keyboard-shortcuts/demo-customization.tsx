import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

// A stronger focus ring for the toolbar and a matching accent for the document area.
const style = {
  '--rpv-focus-ring': '3px solid #facc15',
  '--rpv-focus-ring-offset': '3px',
  '--rpv-accent': '#ca8a04',
} as CSSProperties;

export default function Demo() {
  return <PdfViewer source="/samples/multipage.pdf" style={style} />;
}
