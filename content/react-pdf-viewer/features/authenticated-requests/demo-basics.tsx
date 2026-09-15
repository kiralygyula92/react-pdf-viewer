import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  // Extra fetch options for URL sources: send cookies and a custom header.
  return (
    <PdfViewer
      source="/samples/letter-3pages.pdf"
      requestInit={{ credentials: 'include', headers: { 'X-Requested-With': 'react-pdf-viewer' } }}
    />
  );
}
