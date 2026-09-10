import { PdfViewer, type PdfViewerError } from '@your-scope/react-pdf-viewer';
import { useId, useState } from 'react';
import { REMOTE_PRESETS, sampleUrl } from '../samples';

export const meta = {
  title: '12. Error states',
  description:
    'Each failure shows the error view with Retry while the toolbar stays usable. The onError payload is shown below.',
};

const CASES = {
  notFound: { label: '404 URL', source: sampleUrl('does-not-exist.pdf') },
  notPdf: { label: 'Not a PDF', source: sampleUrl('not-a-pdf.pdf') },
  cors: { label: 'CORS-blocked URL', source: REMOTE_PRESETS[1].url },
  password: { label: 'Password protected', source: sampleUrl('password.pdf') },
} as const;

type CaseId = keyof typeof CASES;

export default function ErrorStatesExample() {
  const name = useId();
  const [caseId, setCaseId] = useState<CaseId>('notFound');
  const [error, setError] = useState<PdfViewerError | null>(null);

  return (
    <div className="demo-stack">
      <fieldset className="demo-radios">
        <legend>Failure</legend>
        {(Object.keys(CASES) as CaseId[]).map((id) => (
          <label key={id} className="demo-check">
            <input
              type="radio"
              name={name}
              value={id}
              checked={caseId === id}
              onChange={() => {
                setCaseId(id);
                setError(null);
              }}
            />
            {CASES[id].label}
          </label>
        ))}
      </fieldset>
      <PdfViewer key={caseId} source={CASES[caseId].source} onError={setError} />
      <pre className="demo-payload" aria-label="onError payload" data-testid="error-payload">
        {error
          ? JSON.stringify(
              { code: error.code, status: error.status, message: error.message },
              null,
              2,
            )
          : 'No error reported yet.'}
      </pre>
    </div>
  );
}
