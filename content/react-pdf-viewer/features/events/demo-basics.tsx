import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

export default function Demo() {
  const [log, setLog] = useState<string[]>([]);
  const record = (line: string) => setLog((previous) => [line, ...previous].slice(0, 8));

  return (
    <>
      <PdfViewer
        source="/samples/multipage.pdf"
        onDocumentLoad={({ numPages, fingerprint }) =>
          record(`onDocumentLoad: ${numPages} pages, ${fingerprint.slice(0, 8)}…`)
        }
        onPageRender={({ page, scale, durationMs }) =>
          record(
            `onPageRender: page ${page} at ${Math.round(scale * 100)}% in ${Math.round(durationMs)} ms`,
          )
        }
        onPageChange={(page) => record(`onPageChange: ${page}`)}
        onScaleChange={(scale) => record(`onScaleChange: ${scale}`)}
      />
      <pre className="demo-output" aria-label="Event log">
        {log.length ? log.join('\n') : 'Waiting for events…'}
      </pre>
    </>
  );
}
