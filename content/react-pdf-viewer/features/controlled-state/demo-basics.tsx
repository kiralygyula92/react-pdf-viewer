import { PdfViewer, type Rotation } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

export default function Demo() {
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState<Rotation>(0);

  return (
    <>
      <p className="demo-controls">
        <button type="button" className="demo-button" onClick={() => setPage(99)}>
          Go to page 99
        </button>
        <button
          type="button"
          className="demo-button"
          onClick={() => setScale((s) => Math.min(5, s + 0.25))}
        >
          Zoom +25%
        </button>
        <button
          type="button"
          className="demo-button"
          onClick={() => {
            setPage(1);
            setScale(1);
            setRotation(0);
          }}
        >
          Reset
        </button>
        <output>
          page {page} · {Math.round(scale * 100)}% · {rotation}°
        </output>
      </p>
      <PdfViewer
        source="/samples/multipage.pdf"
        page={page}
        onPageChange={setPage}
        scale={scale}
        onScaleChange={setScale}
        rotation={rotation}
        onRotationChange={setRotation}
      />
    </>
  );
}
