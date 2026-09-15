import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { useId } from 'react';
import { sampleUrl } from '../samples';

export const meta = {
  title: '8. Custom toolbar',
  description: 'renderToolbar(api) replaces the toolbar with any UI, driven by the viewer API.',
};

export default function CustomToolbarExample() {
  const pageId = useId();
  const zoomId = useId();
  return (
    <PdfViewer
      source={sampleUrl('multipage.pdf')}
      toolbar={{ position: 'top' }}
      renderToolbar={(api) => (
        <div className="custom-toolbar" role="toolbar" aria-label="Document controls">
          <button type="button" onClick={api.previousPage} disabled={api.page <= 1}>
            ‹ Prev
          </button>
          <label htmlFor={pageId}>Page</label>
          <select
            id={pageId}
            value={api.page}
            disabled={api.numPages === 0}
            onChange={(event) => api.goToPage(Number(event.target.value))}
          >
            {Array.from({ length: api.numPages }, (_, index) => (
              <option key={index} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
          <span>of {api.numPages}</span>
          <button type="button" onClick={api.nextPage} disabled={api.page >= api.numPages}>
            Next ›
          </button>
          <label htmlFor={zoomId}>Zoom</label>
          <input
            id={zoomId}
            type="range"
            min={25}
            max={300}
            step={5}
            value={Math.round(api.scale * 100)}
            onChange={(event) => api.setScale(Number(event.target.value) / 100)}
          />
          <output>{Math.round(api.scale * 100)}%</output>
          <button type="button" onClick={api.resetZoom}>
            Reset
          </button>
        </div>
      )}
    />
  );
}
