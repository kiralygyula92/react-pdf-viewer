import { PdfViewer, type Rotation } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';
import { useRoute } from '../router';
import '../pdfjs';
import { sampleUrl } from '../samples';

const neverResolves = () => new Promise<Response>(() => undefined);

const serverError = () =>
  Promise.resolve(
    new Response(
      JSON.stringify({
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'The document could not be generated.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
    ),
  );

/**
 * Deterministic viewer configurations (inline and fullscreen layouts, zoom, rotation and the
 * loading / error / empty states) for the layout and visual Playwright suites.
 *
 * `#/harness?mode=inline|fullscreen&zoom=100|150|25&rotation=0|90&state=loading|error|empty`
 */
export function Harness() {
  const { params } = useRoute();
  const mode = params.get('mode') === 'fullscreen' ? 'fullscreen' : 'inline';
  const state = params.get('state');
  const [scale, setScale] = useState(() => Number(params.get('zoom') ?? '100') / 100 || 1);
  const [rotation, setRotation] = useState<Rotation>(() =>
    params.get('rotation') === '90' ? 90 : 0,
  );
  const [page, setPage] = useState(1);
  const [fullscreen, setFullscreen] = useState(mode === 'fullscreen');

  const viewer = (
    <PdfViewer
      source={state === 'empty' ? '' : sampleUrl('letter-3pages.pdf')}
      fetcher={state === 'loading' ? neverResolves : state === 'error' ? serverError : undefined}
      fileName="harness.pdf"
      page={page}
      onPageChange={setPage}
      scale={scale}
      onScaleChange={setScale}
      rotation={rotation}
      onRotationChange={setRotation}
      fullscreen={fullscreen}
      onFullscreenChange={setFullscreen}
    />
  );

  // Fullscreen is a parent-rendered full-viewport dialog (fullscreenMode is 'controlled' because
  // `fullscreen` is passed); inline is a centered full-width column.
  return (
    <main className={fullscreen ? 'harness harness--fullscreen' : 'harness'} data-testid="harness">
      <h1 className="demo-sr-only">Test harness</h1>
      {fullscreen ? (
        <div className="harness-dialog" role="dialog" aria-modal="true" aria-label="Document">
          {viewer}
        </div>
      ) : (
        <div className="harness-inline">{viewer}</div>
      )}
    </main>
  );
}
