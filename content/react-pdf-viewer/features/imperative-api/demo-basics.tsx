import { PdfViewer, type PdfViewerApi } from '@kiralygyula92/react-pdf-viewer';
import { useRef } from 'react';

export default function Demo() {
  const viewer = useRef<PdfViewerApi>(null);

  return (
    <>
      <p className="demo-controls">
        <button type="button" className="demo-button" onClick={() => viewer.current?.goToPage(20)}>
          Page 20
        </button>
        <button type="button" className="demo-button" onClick={() => viewer.current?.setScale(2)}>
          Zoom to 200%
        </button>
        <button type="button" className="demo-button" onClick={() => viewer.current?.rotate('ccw')}>
          Rotate left
        </button>
        <button
          type="button"
          className="demo-button"
          onClick={() => viewer.current?.toggleFullscreen()}
        >
          Fullscreen
        </button>
      </p>
      <PdfViewer ref={viewer} source="/samples/multipage.pdf" />
    </>
  );
}
