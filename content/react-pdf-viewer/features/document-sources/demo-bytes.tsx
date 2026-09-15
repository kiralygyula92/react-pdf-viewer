import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { useEffect, useState } from 'react';

export default function Demo() {
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    // Bytes you already have: fetched by your own code, generated or decrypted.
    fetch('/samples/mixed-sizes.pdf')
      .then((response) => response.arrayBuffer())
      .then(setBytes);
  }, []);

  // The viewer copies the bytes, so `bytes` stays usable afterwards.
  return <PdfViewer source={bytes} fileName="mixed-sizes.pdf" />;
}
