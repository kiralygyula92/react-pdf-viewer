import { PdfToolbar, PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import type { CSSProperties } from 'react';

const style = {
  '--rpv-toolbar-bg': '#115e59',
  '--rpv-toolbar-max-width': '640px',
} as CSSProperties;

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/letter-3pages.pdf"
      toolbar={{ position: 'top' }}
      style={style}
      renderToolbar={(api) => (
        <PdfToolbar
          api={api}
          zoomReset
          menuPlacement="bottom"
          labels={{ moreActions: 'More' }}
          pageIndicator={
            <span>
              {api.page} ∕ {api.numPages}
            </span>
          }
        />
      )}
    />
  );
}
