import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

export default function Demo() {
  // Keep binary sources in state: they compare by identity.
  const [file, setFile] = useState<File | null>(null);

  return (
    <>
      <p className="demo-controls">
        <label>
          Choose a PDF{' '}
          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </p>
      <PdfViewer source={file} />
    </>
  );
}
