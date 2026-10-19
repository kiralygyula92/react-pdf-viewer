import { PdfViewer, type ToolbarConfig } from '@kingtech/react-pdf-viewer';

const toolbar: ToolbarConfig = {
  actions: [
    'previousPage',
    'pageIndicator',
    'nextPage',
    'zoomOut',
    'zoomLevel',
    'zoomIn',
    'download',
  ],
  hiddenWhenCompact: ['download'],
};

export default function Demo() {
  return <PdfViewer source="/samples/multipage.pdf" toolbar={toolbar} />;
}
