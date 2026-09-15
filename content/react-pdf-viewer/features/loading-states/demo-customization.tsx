import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

const neverResolves = () => new Promise<Response>(() => undefined);

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/letter-3pages.pdf"
      fetcher={neverResolves}
      renderLoading={() => (
        <div role="status" style={{ padding: 32, textAlign: 'center' }}>
          <div
            aria-hidden="true"
            style={{
              width: 240,
              height: 310,
              margin: '0 auto 12px',
              background: '#e2e8f0',
              borderRadius: 8,
            }}
          />
          Preparing your document…
        </div>
      )}
    />
  );
}
