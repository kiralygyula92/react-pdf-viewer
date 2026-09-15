import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  return (
    <PdfViewer
      source={null}
      renderEmpty={() => (
        <div role="status" style={{ padding: 32, textAlign: 'center' }}>
          <strong>No report selected</strong>
          <p>Pick a report from the list to preview it here.</p>
        </div>
      )}
    />
  );
}
