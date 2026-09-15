import { PdfPageCanvas, usePdfDocument } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

/** A two-page spread with highlighted search matches, built from the headless pieces. */
export default function Demo() {
  const { document, numPages } = usePdfDocument('/samples/multipage.pdf');
  const [left, setLeft] = useState(1);
  const [query, setQuery] = useState('viewer');

  if (!document) return <p role="status">Loading…</p>;

  return (
    <>
      <p className="demo-controls">
        <button
          type="button"
          disabled={left <= 1}
          onClick={() => setLeft((p) => Math.max(1, p - 2))}
        >
          ← Previous spread
        </button>
        <button type="button" disabled={left + 2 > numPages} onClick={() => setLeft((p) => p + 2)}>
          Next spread →
        </button>
        <label>
          Highlight <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[left, left + 1]
          .filter((n) => n <= numPages)
          .map((n) => (
            <PdfPageCanvas
              key={n}
              document={document}
              page={n}
              fit={{ width: 320 }}
              textLayer
              highlight={{ query, selected: null }}
              aria-label={`Page ${n} of ${numPages}`}
            />
          ))}
      </div>
    </>
  );
}
