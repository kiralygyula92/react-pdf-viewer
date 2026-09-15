import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  return (
    <div style={{ padding: 16, background: '#121212', borderRadius: 12 }}>
      <PdfViewer source="/samples/multipage.pdf" className="rpv-theme-dark" search thumbnails />
    </div>
  );
}
