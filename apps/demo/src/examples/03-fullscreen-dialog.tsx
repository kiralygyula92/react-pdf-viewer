import { PdfViewer } from '@your-scope/react-pdf-viewer';
import { useEffect, useState } from 'react';
import { sampleUrl } from '../samples';

export const meta = {
  title: '3. Original-style fullscreen dialog',
  description:
    'fullscreenMode="controlled": the parent presents fullscreen as a fixed overlay, like the original host app. The viewer stays mounted, so the document is not reloaded.',
};

export default function FullscreenDialogExample() {
  const [fullscreen, setFullscreen] = useState(false);

  // The parent owns closing, as a dialog would (Esc or a close button).
  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreen]);

  return (
    <div
      className={fullscreen ? 'demo-dialog' : undefined}
      role={fullscreen ? 'dialog' : undefined}
      aria-modal={fullscreen || undefined}
      aria-label={fullscreen ? 'Report' : undefined}
    >
      <PdfViewer
        source={sampleUrl('letter-3pages.pdf')}
        fullscreenMode="controlled"
        fullscreen={fullscreen}
        onFullscreenChange={setFullscreen}
      />
    </div>
  );
}
