import { PdfPageCanvas, usePdfDocument } from '@your-scope/react-pdf-viewer';
import { useState } from 'react';
import { sampleUrl } from '../samples';

export const meta = {
  title: '9. Headless',
  description:
    'usePdfDocument + PdfPageCanvas build a completely custom viewer: here a thumbnail strip and a fitted page.',
};

const SOURCE = sampleUrl('multipage.pdf');

export default function HeadlessExample() {
  const { status, document, numPages, error } = usePdfDocument(SOURCE);
  const [page, setPage] = useState(1);

  if (error) return <p role="alert">{error.message}</p>;
  if (status !== 'ready' || !document) return <p role="status">Loading…</p>;

  return (
    <div className="demo-headless">
      <ol className="demo-thumbs" aria-label="Pages">
        {Array.from({ length: numPages }, (_, index) => index + 1).map((n) => (
          <li key={n}>
            <button
              type="button"
              className="demo-thumb"
              aria-current={n === page ? 'page' : undefined}
              onClick={() => setPage(n)}
            >
              <PdfPageCanvas document={document} page={n} scale={0.15} aria-label={`Page ${n}`} />
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
