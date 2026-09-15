import { PdfViewer, type PdfViewerError } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

const CASES = {
  'Missing file (404)': '/samples/does-not-exist.pdf',
  'Not a PDF': '/samples/not-a-pdf.pdf',
  'Password protected': '/samples/password.pdf',
  'Blocked by CORS': 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
};

type Case = keyof typeof CASES;

export default function Demo() {
  const [current, setCurrent] = useState<Case>('Missing file (404)');
  const [error, setError] = useState<PdfViewerError | null>(null);

  return (
    <>
      <p className="demo-controls">
        <label>
          Failure{' '}
          <select
            value={current}
            onChange={(event) => {
              setCurrent(event.target.value as Case);
              setError(null);
            }}
          >
            {Object.keys(CASES).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </p>
      <PdfViewer key={current} source={CASES[current]} onError={setError} />
      <pre className="demo-output" aria-label="onError payload">
        {error
          ? JSON.stringify(
              { code: error.code, status: error.status, message: error.message },
              null,
              2,
            )
          : 'onError not called yet'}
      </pre>
    </>
  );
}
