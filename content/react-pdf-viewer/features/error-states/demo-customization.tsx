import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/does-not-exist.pdf"
      renderError={(error, { retry }) => (
        <div role="alert" style={{ padding: 24, border: '1px solid #fca5a5', borderRadius: 12 }}>
          <strong>We couldn’t open this document.</strong>
          <p>
            {error.code === 'HTTP_ERROR' && error.status === 404
              ? 'It may have been moved or deleted.'
              : error.message}
          </p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}
    />
  );
}
