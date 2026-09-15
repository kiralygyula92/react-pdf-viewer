import { PdfToolbar, PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/multipage.pdf"
      renderToolbar={(api) => (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PdfToolbar
            api={api}
            config={{ actions: ['previousPage', 'pageIndicator', 'nextPage'] }}
          />
          <button type="button" onClick={() => void api.print()}>
            Print this report
          </button>
        </div>
      )}
    />
  );
}
