import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

// Fit into a wider, shorter document area than the default.
const style = {
  '--rpv-viewport-max-width': '900px',
  '--rpv-viewport-min-height': '360px',
  '--rpv-viewport-max-height': '360px',
  '--rpv-page-radius': '0px',
} as CSSProperties;

export default function Demo() {
  return (
    <PdfViewer source="/samples/mixed-sizes.pdf" defaultPage={3} fitMode="page" style={style} />
  );
}
