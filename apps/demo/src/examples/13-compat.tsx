import { CustomPdfViewer } from '@your-scope/react-pdf-viewer/compat';
import { useCallback, useState } from 'react';
import { sampleUrl } from '../samples';

export const meta = {
  title: '13. Compat wrapper',
  description:
    'CustomPdfViewer from /compat accepts the original component’s props verbatim, with the host’s lifted-state pattern.',
};

export default function CompatExample() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const handleError = useCallback((error: string) => console.error('PDF Error:', error), []);

  return (
    <div className={isFullscreen ? 'demo-dialog' : undefined}>
      <CustomPdfViewer
        pdfUrl={sampleUrl('letter-3pages.pdf')}
        documentName="report-2026-09-10.pdf"
        onError={handleError}
        isFullscreen={isFullscreen}
        onFullscreenChange={setIsFullscreen}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        scale={scale}
        onScaleChange={setScale}
        rotation={rotation}
        onRotationChange={setRotation}
        onUnauthorized={() => window.alert('Would redirect to sign-in')}
      />
    </div>
  );
}
