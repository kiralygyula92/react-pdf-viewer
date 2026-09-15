import { PdfViewer, type Rotation } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

const turn = (rotation: Rotation, quarters: number) =>
  ((((rotation + quarters * 90) % 360) + 360) % 360) as Rotation;

export default function Demo() {
  const [rotation, setRotation] = useState<Rotation>(90);

  return (
    <>
      <p className="demo-controls">
        <button
          type="button"
          className="demo-button"
          onClick={() => setRotation((r) => turn(r, -1))}
        >
          ↺ Counter-clockwise
        </button>
        <button
          type="button"
          className="demo-button"
          onClick={() => setRotation((r) => turn(r, 1))}
        >
          ↻ Clockwise
        </button>
        <output>{rotation}°</output>
      </p>
      <PdfViewer
        source="/samples/letter-3pages.pdf"
        rotation={rotation}
        onRotationChange={setRotation}
      />
    </>
  );
}
