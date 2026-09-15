import { PdfViewer, type PdfViewerLabels } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

const labels: Partial<PdfViewerLabels> = {
  search: 'Find in report',
  searchResults: (current, total) => `${current}/${total}`,
  searchNoResults: 'Nothing found',
};

const style = {
  '--rpv-search-highlight': 'rgba(56, 189, 248, 0.45)',
  '--rpv-search-highlight-selected': 'rgba(37, 99, 235, 0.6)',
  '--rpv-search-bg': '#f8fafc',
} as CSSProperties;

export default function Demo() {
  return <PdfViewer source="/samples/multipage.pdf" search labels={labels} style={style} />;
}
