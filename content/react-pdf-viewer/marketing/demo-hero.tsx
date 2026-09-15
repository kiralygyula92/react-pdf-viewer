import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function HeroDemo() {
  return (
    <PdfViewer
      source="/samples/multipage.pdf"
      layout="continuous"
      thumbnails
      search
      pageInput
      zoomReset
      annotationLayer
      style={
        {
          '--rpv-viewport-min-height': '520px',
          '--rpv-viewport-max-height': '520px',
        } as React.CSSProperties
      }
    />
  );
}
