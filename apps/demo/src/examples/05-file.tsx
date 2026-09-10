import { PdfViewer } from '@your-scope/react-pdf-viewer';
import { useId, useState } from 'react';

export const meta = {
  title: '5. From a File',
  description: 'Pass a File (a Blob) straight to source. The file never leaves the browser.',
};

export default function FileExample() {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="demo-stack">
      <label htmlFor={inputId}>Choose a PDF</label>
      <input
        id={inputId}
        type="file"
        accept=".pdf,application/pdf"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <PdfViewer source={file} />
    </div>
  );
}
