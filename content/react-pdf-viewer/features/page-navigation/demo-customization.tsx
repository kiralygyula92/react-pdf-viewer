import { PdfViewer, type PdfViewerLabels } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

// Module scope keeps the object stable between renders.
const labels: Partial<PdfViewerLabels> = {
  previousPage: 'Previous sheet',
  nextPage: 'Next sheet',
  pageIndicator: (page, total, { formatNumber }) =>
    `Sheet ${formatNumber(page)} of ${formatNumber(total)}`,
};

const style = {
  '--rpv-toolbar-bg': '#0f766e',
  '--rpv-label-font-weight': '500',
} as CSSProperties;

export default function Demo() {
  return <PdfViewer source="/samples/multipage.pdf" labels={labels} style={style} />;
}
