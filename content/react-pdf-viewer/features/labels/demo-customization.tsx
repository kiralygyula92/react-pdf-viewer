import { PdfViewer, type PdfViewerLabels } from '@kiralygyula92/react-pdf-viewer';

// Label functions receive a formatter for the viewer's locale.
const labels: Partial<PdfViewerLabels> = {
  zoomLevel: (percent, { formatNumber }) => `${formatNumber(percent)} %`,
  pageIndicator: (page, total, { formatNumber }) =>
    `${formatNumber(page)} از ${formatNumber(total)}`,
};

export default function Demo() {
  // Arabic-Indic digits from the "fa-IR" locale.
  return <PdfViewer source="/samples/multipage.pdf" locale="fa-IR" labels={labels} />;
}
