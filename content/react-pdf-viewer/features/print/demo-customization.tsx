import { PdfViewer, type PdfViewerLabels } from '@kiralygyula92/react-pdf-viewer';

const labels: Partial<PdfViewerLabels> = {
  print: 'Print document',
  printProgress: (done, total) => `Preparing page ${done} of ${total}…`,
  cancel: 'Stop',
};

export default function Demo() {
  return <PdfViewer source="/samples/multipage.pdf" labels={labels} />;
}
