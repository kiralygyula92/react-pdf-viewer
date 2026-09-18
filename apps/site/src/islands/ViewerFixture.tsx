import { PdfViewer, type Rotation } from '@kiralygyula92/react-pdf-viewer';
import '@kiralygyula92/react-pdf-viewer/styles.css';
import '../pdfjs';
import { replaceQuery, useRoute } from '../router';
import '../styles/demos.css';

function toInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toRotation(value: string | null): Rotation {
  const quarter = Math.round(toInt(value, 0) / 90);
  return ((((quarter % 4) + 4) % 4) * 90) as Rotation;
}

/**
 * `/_internal/viewer/?src=<url>&page=&zoom=&rotation=`: a full-page viewer whose state lives in the
 * URL, used by the functional e2e suites.
 */
export default function ViewerFixture() {
  const { params } = useRoute();
  const src = params.get('src') ?? '';
  const page = Math.max(1, toInt(params.get('page'), 1));
  const zoom = Math.min(500, Math.max(25, toInt(params.get('zoom'), 100)));
  const rotation = toRotation(params.get('rotation'));

  const update = (patch: { page?: number; zoom?: number; rotation?: number }) =>
    replaceQuery({
      src: src || undefined,
      page: String(patch.page ?? page),
      zoom: String(patch.zoom ?? zoom),
      rotation: String(patch.rotation ?? rotation),
    });

  return (
    <div className="demo-view">
      <h1 className="demo-sr-only">Viewing {src || 'no document'}</h1>
      <PdfViewer
        className="demo-fill"
        source={src || null}
        page={page}
        onPageChange={(value) => update({ page: value })}
        scale={zoom / 100}
        onScaleChange={(value) => update({ zoom: Math.round(value * 100) })}
        rotation={rotation}
        onRotationChange={(value) => update({ rotation: value })}
      />
    </div>
  );
}
