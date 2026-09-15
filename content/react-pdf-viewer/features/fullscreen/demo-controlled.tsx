import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

export default function Demo() {
  const [fullscreen, setFullscreen] = useState(false);

  const viewer = (
    <PdfViewer
      source="/samples/letter-3pages.pdf"
      fullscreen={fullscreen}
      onFullscreenChange={setFullscreen}
    />
  );

  // `fullscreen` is passed, so the mode is "controlled": the viewer switches to its fullscreen
  // layout and this component decides how to present it. The viewer stays mounted.
  return fullscreen ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Document"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#fff', overflowY: 'auto' }}
    >
      {viewer}
    </div>
  ) : (
    viewer
  );
}
