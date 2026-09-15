import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

export default function Demo() {
  const [message, setMessage] = useState('Click the download button in the toolbar.');

  return (
    <>
      <p className="demo-output" role="status">
        {message}
      </p>
      <PdfViewer
        source="/samples/letter-3pages.pdf"
        onDownload={({ fileName, data }) => {
          // Upload, log or post-process the bytes instead of saving them.
          setMessage(`Intercepted ${fileName}: ${data.byteLength.toLocaleString()} bytes.`);
          return false;
        }}
      />
    </>
  );
}
