import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

const style = {
  '--rpv-thumbnails-width': '112px',
  '--rpv-accent': '#c2410c',
} as CSSProperties;

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/multipage.pdf"
      thumbnails
      labels={{ thumbnails: 'Page overview' }}
      style={style}
    />
  );
}
