import { PdfViewer, type PdfViewerLabels } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

const labels: Partial<PdfViewerLabels> = {
  zoomLevel: (percent) => `${percent} %`,
  zoomIn: 'Enlarge',
  zoomOut: 'Reduce',
};

const style = {
  '--rpv-toolbar-bg': '#1e293b',
  '--rpv-label-font-size': '13px',
  '--rpv-button-size': '38px',
} as CSSProperties;

export default function Demo() {
  return (
    <PdfViewer source="/samples/letter-3pages.pdf" scaleStep={0.1} labels={labels} style={style} />
  );
}
