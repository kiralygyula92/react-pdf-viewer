import { PdfViewer, type PdfViewerErrorCode, type Rotation } from '@kiralygyula92/react-pdf-viewer';
import { useId, useState, type FormEvent } from 'react';
import { CorsExplainer } from '../components/SourcePicker';
import { useFileDrop } from '../components/useFileDrop';
import { href, replaceRoute, useRoute } from '../router';
import { REMOTE_PRESETS, sampleUrl } from '../samples';

function toInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toRotation(value: string | null): Rotation {
  const quarter = Math.round(toInt(value, 0) / 90);
  return ((((quarter % 4) + 4) % 4) * 90) as Rotation;
}

function OpenForm({ onFile }: { onFile: (file: File) => void }) {
  const urlId = useId();
  const fileId = useId();
  const [value, setValue] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value) window.location.assign(href('view', { src: value }));
  };

  return (
    <section className="demo-panel demo-open-form" aria-labelledby="open-heading">
      <h1 id="open-heading">Open a PDF</h1>
      <p>
        Paste a URL (shareable as a deep link), pick a file, or drop one anywhere on this page. Deep
        links accept <code>src</code>, <code>page</code>, <code>zoom</code> (percent) and{' '}
        <code>rotation</code>.
      </p>
      <form className="demo-stack" onSubmit={submit}>
        <label htmlFor={urlId}>PDF URL</label>
        <div className="demo-row">
          <input
            id={urlId}
            type="url"
            required
            placeholder="https://example.com/file.pdf"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <button type="submit" className="demo-button demo-button--primary">
            Open
          </button>
        </div>
      </form>
      <ul className="demo-list">
        <li>
          <a href={href('view', { src: sampleUrl('multipage.pdf'), page: '2', zoom: '150' })}>
            Bundled sample, page 2 at 150%
          </a>
        </li>
        {REMOTE_PRESETS.map((preset) => (
          <li key={preset.url}>
            <a href={href('view', { src: preset.url })}>{preset.label}</a>
          </li>
        ))}
      </ul>
      <div className="demo-stack">
        <label htmlFor={fileId}>Or choose a file</label>
        <input
          id={fileId}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </div>
    </section>
  );
}

/**
 * `/_internal/viewer/?src=<url>&page=&zoom=&rotation=`: a full-page viewer whose state lives in the
 * URL, used as a fixture by the functional e2e suites (EXCEPTIONS E-03).
 */
export function StandaloneViewer() {
  const { params } = useRoute();
  const src = params.get('src') ?? '';
  const page = Math.max(1, toInt(params.get('page'), 1));
  const zoom = Math.min(500, Math.max(25, toInt(params.get('zoom'), 100)));
  const rotation = toRotation(params.get('rotation'));
  const [file, setFile] = useState<File | null>(null);
  const [lastError, setLastError] = useState<PdfViewerErrorCode | undefined>();

  useFileDrop((dropped) => {
    setFile(dropped);
    setLastError(undefined);
  });

  const update = (patch: { page?: number; zoom?: number; rotation?: number }) =>
    replaceRoute('view', {
      src: src || undefined,
      page: String(patch.page ?? page),
      zoom: String(patch.zoom ?? zoom),
      rotation: String(patch.rotation ?? rotation),
    });

  const source = file ?? (src || null);
  if (!source) {
    return <OpenForm onFile={setFile} />;
  }

  return (
    <div className="demo-view">
      <h1 className="demo-sr-only">Viewing {file ? file.name : src}</h1>
      {lastError === 'NETWORK_ERROR' && <CorsExplainer />}
      <PdfViewer
        className="demo-fill"
        source={source}
        page={page}
        onPageChange={(value) => update({ page: value })}
        scale={zoom / 100}
        onScaleChange={(value) => update({ zoom: Math.round(value * 100) })}
        rotation={rotation}
        onRotationChange={(value) => update({ rotation: value })}
        onError={(error) => setLastError(error.code)}
      />
    </div>
  );
}
