import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

const CHAPTERS = [
  { title: 'Introduction', page: 1 },
  { title: 'Chapter 2', page: 11 },
  { title: 'Chapter 3', page: 21 },
  { title: 'Appendix', page: 40 },
];

export default function Demo() {
  const [page, setPage] = useState(1);

  return (
    <>
      <nav className="demo-controls" aria-label="Chapters">
        {CHAPTERS.map((chapter) => (
          <button
            key={chapter.page}
            type="button"
            className="demo-button"
            aria-current={page >= chapter.page ? 'true' : undefined}
            onClick={() => setPage(chapter.page)}
          >
            {chapter.title}
          </button>
        ))}
        <output>Page {page}</output>
      </nav>
      <PdfViewer source="/samples/multipage.pdf" page={page} onPageChange={setPage} />
    </>
  );
}
