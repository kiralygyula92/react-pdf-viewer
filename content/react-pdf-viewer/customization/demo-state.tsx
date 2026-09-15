import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

const css = `
  .status-aware[data-status='error'] {
    --rpv-toolbar-bg: #991b1b;
  }
  .status-aware[data-status='loading'] {
    --rpv-toolbar-bg: #475569;
  }
`;

export default function Demo() {
  return (
    <>
      <style>{css}</style>
      <PdfViewer className="status-aware" source="/samples/does-not-exist.pdf" />
    </>
  );
}
