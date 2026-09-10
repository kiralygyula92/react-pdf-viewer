import { PdfViewer } from '@your-scope/react-pdf-viewer';
import { useEffect, useState } from 'react';
import { sampleUrl } from '../samples';

export const meta = {
  title: '6. From an ArrayBuffer',
  description:
    'Bytes you already have (fetched, generated or decrypted) can be passed directly. The viewer copies them, so your buffer stays usable.',
};

export default function ArrayBufferExample() {
  const [data, setData] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    let active = true;
    fetch(sampleUrl('mixed-sizes.pdf'))
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        if (active) setData(buffer);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="demo-stack">
      <p className="demo-hint">
        {data ? `Loaded ${data.byteLength.toLocaleString()} bytes.` : 'Fetching bytes…'}
      </p>
      <PdfViewer source={data} fileName="mixed-sizes.pdf" />
    </div>
  );
}
