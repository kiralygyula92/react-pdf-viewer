import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/multipage.pdf"
      toolbar={{ position: 'top' }}
      renderToolbar={(api) => (
        <div className="demo-controls" role="group" aria-label="Document controls">
          <button
            type="button"
            className="demo-button"
            onClick={api.previousPage}
            disabled={api.page <= 1}
          >
            ← Back
          </button>
          <span aria-live="polite">
            Page {api.page} of {api.numPages}
          </span>
          <button
            type="button"
            className="demo-button"
            onClick={api.nextPage}
            disabled={api.page >= api.numPages}
          >
            Next →
          </button>
          <select
            aria-label="Zoom"
            value={String(api.scale)}
            onChange={(event) => api.setScale(Number(event.target.value))}
          >
            {[0.5, 0.75, 1, 1.5, 2].map((scale) => (
              <option key={scale} value={String(scale)}>
                {scale * 100}%
              </option>
            ))}
          </select>
          <button type="button" className="demo-button" onClick={() => void api.download()}>
            Download
          </button>
        </div>
      )}
    />
  );
}
