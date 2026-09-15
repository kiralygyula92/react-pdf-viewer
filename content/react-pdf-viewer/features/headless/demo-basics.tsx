import { PdfPageCanvas, usePdfDocument } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

export default function Demo() {
  const { status, document, numPages, error, reload } = usePdfDocument('/samples/multipage.pdf');
  const [page, setPage] = useState(1);

  if (status === 'error') {
    return (
      <p role="alert">
        {error?.message}{' '}
        <button type="button" onClick={reload}>
          Retry
        </button>
      </p>
    );
  }
  if (status !== 'ready' || !document) return <p role="status">Loading…</p>;

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'start' }}
    >
      <ol
        aria-label="Pages"
        style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 520, overflow: 'auto' }}
      >
        {Array.from({ length: numPages }, (_, index) => index + 1).map((n) => (
          <li key={n}>
            <button
              type="button"
              aria-current={n === page ? 'page' : undefined}
              onClick={() => setPage(n)}
              style={{
                border: n === page ? '2px solid #1d4ed8' : '2px solid transparent',
                background: 'none',
                padding: 2,
              }}
            >
              <PdfPageCanvas
                document={document}
                page={n}
                fit={{ width: 96 }}
                aria-label={`Page ${n}`}
              />
            </button>
          </li>
        ))}
      </ol>
      <PdfPageCanvas
        document={document}
        page={page}
        fit={{ width: 520 }}
        aria-label={`Page ${page} of ${numPages}`}
      />
    </div>
  );
}
