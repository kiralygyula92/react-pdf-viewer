import { PdfViewer, type PdfViewerApi } from '@kiralygyula92/react-pdf-viewer';
import { useRef, useState } from 'react';

export default function Demo() {
  const viewer = useRef<PdfViewerApi>(null);
  const [info, setInfo] = useState('');

  return (
    <>
      <p className="demo-controls">
        <button
          type="button"
          className="demo-button"
          onClick={() => void viewer.current?.download()}
        >
          Download
        </button>
        <button type="button" className="demo-button" onClick={() => void viewer.current?.print()}>
          Print
        </button>
        <button type="button" className="demo-button" onClick={() => viewer.current?.reload()}>
          Reload
        </button>
        <button
          type="button"
          className="demo-button"
          onClick={async () => {
            const document = viewer.current?.getDocument();
            const metadata = await document?.getMetadata();
            setInfo(JSON.stringify(metadata?.info ?? {}, null, 2));
          }}
        >
          Read metadata
        </button>
      </p>
      {/* Toolbar hidden: the buttons above are the whole interface. */}
      <PdfViewer ref={viewer} source="/samples/letter-3pages.pdf" toolbar={false} />
      {info && <pre className="demo-output">{info}</pre>}
    </>
  );
}
