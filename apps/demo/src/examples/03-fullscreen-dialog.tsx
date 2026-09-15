import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { useEffect, useState } from 'react';
import { sampleUrl } from '../samples';

export const meta = {
  title: '3. Fullscreen in your own dialog',
  description:
    'fullscreenMode="controlled": the parent presents fullscreen as a fixed overlay. The viewer stays mounted, so the document is not reloaded.',
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
      aria-label={fullscreen ? 'Document' : undefined}
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
