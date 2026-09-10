import { PdfViewer, type Rotation } from '@your-scope/react-pdf-viewer';
import { useState } from 'react';
import { useRoute } from '../router';
import { sampleUrl } from '../samples';

const neverResolves = () => new Promise<Response>(() => undefined);

const serverError = () =>
  Promise.resolve(
    new Response(
      JSON.stringify({
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'The report could not be generated.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
    ),
  );

/**
 * Deterministic configurations mirroring the original's layout states, for Playwright.
 *
 * `#/parity?mode=inline|fullscreen&zoom=100|150|25&rotation=0|90&state=loading|error|empty`
 */
export function Parity() {
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
      fileName="parity.pdf"
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

  // Like the host app: fullscreen is a parent-rendered full-viewport dialog (fullscreenMode is
  // 'controlled' because `fullscreen` is passed); inline is a centered full-width column.
  return (
    <main className={fullscreen ? 'parity parity--fullscreen' : 'parity'} data-testid="parity">
      <h1 className="demo-sr-only">Parity harness</h1>
      {fullscreen ? (
        <div className="parity-dialog" role="dialog" aria-modal="true" aria-label="Report">
          {viewer}
        </div>
      ) : (
        <div className="parity-inline">{viewer}</div>
      )}
    </main>
  );
}
