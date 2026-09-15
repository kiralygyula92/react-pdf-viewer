import { PdfViewer, type PageRenderInfo } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

export default function Demo() {
  const [last, setLast] = useState<PageRenderInfo | null>(null);

  return (
    <>
      <p className="demo-output" role="status">
        {last
          ? `Page ${last.page}: ${Math.round(last.width)} × ${Math.round(last.height)} px, rendered in ${Math.round(last.durationMs)} ms`
          : 'Render a page to measure it.'}
      </p>
      <PdfViewer source="/samples/mixed-sizes.pdf" onPageRender={setLast} zoomReset />
    </>
  );
}
