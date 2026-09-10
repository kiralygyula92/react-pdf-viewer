import { PdfViewer, type Rotation } from '@your-scope/react-pdf-viewer';
import { useState } from 'react';
import { sampleUrl } from '../samples';

export const meta = {
  title: '2. Controlled state',
  description:
    'The parent owns page, scale and rotation. External buttons and the toolbar stay in sync; out-of-range pages are clamped and reported back.',
};

export default function ControlledExample() {
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState<Rotation>(0);

  return (
    <div className="demo-stack">
      <div className="demo-row demo-wrap" role="group" aria-label="External controls">
        <button
          type="button"
          className="demo-button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <output aria-live="polite">Page {page}</output>
        <button type="button" className="demo-button" onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
        <button
          type="button"
          className="demo-button"
          onClick={() => setScale((s) => Math.min(5, Math.round((s + 0.25) * 100) / 100))}
        >
          Zoom +25%
        </button>
        <button
          type="button"
          className="demo-button"
          onClick={() => setRotation((r) => ((r + 90) % 360) as Rotation)}
        >
          Rotate
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
      </div>
      <PdfViewer
        source={sampleUrl('multipage.pdf')}
        page={page}
        onPageChange={setPage}
        scale={scale}
        onScaleChange={setScale}
        rotation={rotation}
        onRotationChange={setRotation}
      />
    </div>
  );
}
