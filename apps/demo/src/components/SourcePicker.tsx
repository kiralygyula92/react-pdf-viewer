import type { PdfSource, PdfViewerErrorCode } from '@your-scope/react-pdf-viewer';
import { useId, useState, type FormEvent } from 'react';
import { href } from '../router';
import { REMOTE_PRESETS, sampleUrl, useSamples } from '../samples';
import { Tabs } from './Tabs';

/** A chosen document and a human-readable label for it. */
export interface SelectedSource {
  source: PdfSource;
  label: string;
  /** Set for URL and sample sources (shareable). */
  url?: string;
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

function validateUrl(value: string): string | null {
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function CorsExplainer() {
  return (
    <div className="demo-callout" role="note">
      <strong>The request was blocked or failed.</strong> Browsers only let a page read a
      cross-origin file when the server sends <code>Access-Control-Allow-Origin</code> for this
      site. If you control the server, add that header; otherwise proxy the file through your own
      origin. Try the CORS-enabled preset to compare.
    </div>
  );
}

function UrlForm({
  onSelect,
  errorCode,
}: {
  onSelect: (selection: SelectedSource) => void;
  errorCode?: PdfViewerErrorCode | undefined;
}) {
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const valid = validateUrl(value);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onSelect({ source: valid, label: valid, url: valid });
  };

  return (
    <form className="demo-stack" onSubmit={submit} noValidate>
      <label htmlFor={inputId}>PDF URL</label>
      <div className="demo-row">
        <input
          id={inputId}
          type="url"
          inputMode="url"
          placeholder="https://example.com/file.pdf"
          value={value}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="submit" className="demo-button demo-button--primary">
          Open
        </button>
      </div>
      {invalid && (
        <p id={errorId} className="demo-field-error">
          Enter an http(s) URL.
        </p>
      )}
      <fieldset className="demo-presets">
        <legend>Presets</legend>
        {REMOTE_PRESETS.map((preset) => (
          <button
            key={preset.url}
            type="button"
            className="demo-link-button"
            onClick={() => {
              setValue(preset.url);
              onSelect({ source: preset.url, label: preset.label, url: preset.url });
            }}
          >
            {preset.label}
          </button>
        ))}
      </fieldset>
      {valid && <a href={href('/view', { src: valid })}>Open in standalone viewer</a>}
      {errorCode === 'NETWORK_ERROR' && <CorsExplainer />}
    </form>
  );
}

function FilePicker({ onSelect }: { onSelect: (selection: SelectedSource) => void }) {
  const inputId = useId();
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <div className="demo-stack">
      <label htmlFor={inputId}>Choose a PDF file</label>
      <input
        id={inputId}
        type="file"
        accept=".pdf,application/pdf"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            setFileName(file.name);
            onSelect({ source: file, label: file.name });
          }
        }}
      />
      <p className="demo-hint">
        {fileName ? `Selected: ${fileName}` : 'Or drop a PDF anywhere on the page.'} Files stay in
        your browser; nothing is uploaded.
      </p>
    </div>
  );
}

/** Samples / URL / File tabs. */
export function SourcePicker({
  onSelect,
  errorCode,
  current,
}: {
  onSelect: (selection: SelectedSource) => void;
  errorCode?: PdfViewerErrorCode | undefined;
  current?: string | undefined;
}) {
  const samples = useSamples();
  const [tab, setTab] = useState('samples');
  return (
    <Tabs
      label="Document source"
      selected={tab}
      onSelect={setTab}
      tabs={[
        {
          id: 'samples',
          label: 'Samples',
          content: (
            <ul className="demo-sample-list">
              {samples.map((sample) => {
                const url = sampleUrl(sample.file);
                return (
                  <li key={sample.file}>
                    <button
                      type="button"
                      className="demo-sample"
                      aria-pressed={current === url}
                      onClick={() => onSelect({ source: url, label: sample.title, url })}
                    >
                      <span className="demo-sample__title">{sample.title}</span>
                      <span className="demo-sample__meta">
                        {sample.pages > 0 ? `${sample.pages} pages · ` : ''}
                        {sample.notes}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ),
        },
        { id: 'url', label: 'URL', content: <UrlForm onSelect={onSelect} errorCode={errorCode} /> },
        { id: 'file', label: 'File', content: <FilePicker onSelect={onSelect} /> },
      ]}
    />
  );
}
