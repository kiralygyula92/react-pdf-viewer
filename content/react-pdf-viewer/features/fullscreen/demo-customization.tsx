import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

const style = {
  '--rpv-fullscreen-bg': '#0f172a',
  '--rpv-toolbar-bg': '#334155',
  '--rpv-viewport-padding-fullscreen': '48px',
} as CSSProperties;

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/letter-3pages.pdf"
      fullscreenMode="overlay"
      labels={{ enterFullscreen: 'Focus mode', exitFullscreen: 'Leave focus mode' }}
      style={style}
    />
  );
}
