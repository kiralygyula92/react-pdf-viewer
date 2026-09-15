import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

export default function Demo() {
  const [width, setWidth] = useState(420);

  return (
    <>
      <p className="demo-controls">
        <label>
          Container width: {width}px{' '}
          <input
            type="range"
            min={320}
            max={720}
            step={10}
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
          />
        </label>
      </p>
      <div style={{ width, maxWidth: '100%', margin: '0 auto' }}>
        <PdfViewer source="/samples/letter-3pages.pdf" pageInput zoomReset />
      </div>
    </>
  );
}
