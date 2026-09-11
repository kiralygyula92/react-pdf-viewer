import {
  PdfViewer,
  type PdfViewerApi,
  type PdfViewerErrorCode,
  type Rotation,
} from '@your-scope/react-pdf-viewer';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { EventLog, useEventLog } from '../components/EventLog';
import { SourcePicker, type SelectedSource } from '../components/SourcePicker';
import { useFileDrop } from '../components/useFileDrop';
import { hungarianLabels } from '../i18n';
import { sampleUrl } from '../samples';

interface Options {
  controlled: boolean;
  toolbarPosition: 'bottom' | 'top';
  fullscreenMode: 'native' | 'overlay' | 'controlled';
  fitMode: 'none' | 'width' | 'page';
  zoomPresets: boolean;
  layout: 'single' | 'continuous';
  textLayer: boolean;
  annotationLayer: boolean;
  search: boolean;
  thumbnails: boolean;
  pageInput: boolean;
  zoomReset: boolean;
  wheelZoom: boolean;
  passwordPrompt: boolean;
  keyboardShortcuts: boolean;
  printMode: 'render' | 'open-url';
  compactBreakpoint: number;
  theme: 'default' | 'dark' | 'custom';
  toolbarColor: string;
  accentColor: string;
  language: 'en' | 'hu';
  containerWidth: number;
}

/** Library defaults: the original component's look and behavior. */
const PARITY_DEFAULTS: Options = {
  controlled: false,
  toolbarPosition: 'bottom',
  fullscreenMode: 'native',
  fitMode: 'none',
  zoomPresets: false,
  layout: 'single',
  textLayer: false,
  annotationLayer: false,
  search: false,
  thumbnails: false,
  pageInput: false,
  zoomReset: false,
  wheelZoom: false,
  passwordPrompt: false,
  keyboardShortcuts: true,
  printMode: 'render',
  compactBreakpoint: 960,
  theme: 'default',
  toolbarColor: '#54646e',
  accentColor: '#1976d2',
  language: 'en',
  containerWidth: 1400,
};

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];
const INITIAL_SOURCE = sampleUrl('letter-3pages.pdf');

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: (id: string) => ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="demo-field">
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <p className="demo-hint">{hint}</p>}
    </div>
  );
}

export function Playground() {
  const [selection, setSelection] = useState<SelectedSource>({
    source: INITIAL_SOURCE,
    label: 'US Letter, 3 pages',
    url: INITIAL_SOURCE,
  });
  const [options, setOptions] = useState(PARITY_DEFAULTS);
  const [lastError, setLastError] = useState<PdfViewerErrorCode | undefined>();
  const { entries, log, clear } = useEventLog();
  const viewer = useRef<PdfViewerApi>(null);

  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [goTo, setGoTo] = useState(1);

  const set = <K extends keyof Options>(key: K, value: Options[K]) =>
    setOptions((current) => ({ ...current, [key]: value }));

  const select = useCallback(
    (next: SelectedSource) => {
      setSelection(next);
      setLastError(undefined);
      setPage(1);
      log('source', next.label);
    },
    [log],
  );
  const dragging = useFileDrop((file) => select({ source: file, label: file.name }));

  // Parent-presented fullscreen (fullscreenMode="controlled"): the parent owns Esc.
  const parentFullscreen = options.fullscreenMode === 'controlled' && fullscreen;
  useEffect(() => {
    if (!parentFullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [parentFullscreen]);

  const themeClass =
    options.theme === 'dark'
      ? 'rpv-theme-dark'
      : options.theme === 'custom'
        ? 'demo-custom-theme'
        : '';
  const stageStyle = {
    maxWidth: parentFullscreen ? undefined : `${options.containerWidth}px`,
    ...(options.theme === 'custom'
      ? { '--rpv-toolbar-bg': options.toolbarColor, '--rpv-accent': options.accentColor }
      : {}),
  } as CSSProperties;

  const stateProps = options.controlled
    ? {
        page,
        scale,
        rotation,
      }
    : {};

  return (
    <div className="demo-playground">
      <aside className="demo-sidebar" aria-label="Playground settings">
        <section className="demo-panel" aria-labelledby="source-heading">
          <h2 id="source-heading">Source</h2>
          <SourcePicker onSelect={select} errorCode={lastError} current={selection.url} />
        </section>

        <section className="demo-panel" aria-labelledby="options-heading">
          <h2 id="options-heading">Options</h2>
          <div className="demo-stack">
            <label className="demo-check">
              <input
                type="checkbox"
                checked={options.controlled}
                onChange={(event) => set('controlled', event.target.checked)}
              />
              Controlled state
            </label>
            {options.controlled && (
              <div className="demo-grid-3">
                <Field label="Page">
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      min={1}
                      value={page}
                      onChange={(event) => setPage(Number(event.target.value) || 1)}
                    />
                  )}
                </Field>
                <Field label="Zoom %">
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      min={25}
                      max={500}
                      step={5}
                      value={Math.round(scale * 100)}
                      onChange={(event) => setScale((Number(event.target.value) || 100) / 100)}
                    />
                  )}
                </Field>
                <Field label="Rotation">
                  {(id) => (
                    <select
                      id={id}
                      value={rotation}
                      onChange={(event) => setRotation(Number(event.target.value) as Rotation)}
                    >
                      {[0, 90, 180, 270].map((value) => (
                        <option key={value} value={value}>
                          {value}°
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
            )}
            <Field label="Toolbar position">
              {(id) => (
                <select
                  id={id}
                  value={options.toolbarPosition}
                  onChange={(event) =>
                    set('toolbarPosition', event.target.value as Options['toolbarPosition'])
                  }
                >
                  <option value="bottom">Bottom (original)</option>
                  <option value="top">Top</option>
                </select>
              )}
            </Field>
            <Field label="Fullscreen mode">
              {(id) => (
                <select
                  id={id}
                  value={options.fullscreenMode}
                  onChange={(event) => {
                    setFullscreen(false);
                    set('fullscreenMode', event.target.value as Options['fullscreenMode']);
                  }}
                >
                  <option value="native">Native (Fullscreen API)</option>
                  <option value="overlay">Overlay</option>
                  <option value="controlled">Controlled (parent presents)</option>
                </select>
              )}
            </Field>
            <Field label="Fit mode" hint="Applies at the default scale; zoom shows true size.">
              {(id) => (
                <select
                  id={id}
                  value={options.fitMode}
                  onChange={(event) => set('fitMode', event.target.value as Options['fitMode'])}
                >
                  <option value="none">None (shrink to width, original)</option>
                  <option value="width">Fit width</option>
                  <option value="page">Fit page</option>
                </select>
              )}
            </Field>
            <label className="demo-check">
              <input
                type="checkbox"
                checked={options.zoomPresets}
                onChange={(event) => set('zoomPresets', event.target.checked)}
              />
              Zoom presets (25 … 500%)
            </label>
            <Field label="Layout">
              {(id) => (
                <select
                  id={id}
                  value={options.layout}
                  onChange={(event) => set('layout', event.target.value as Options['layout'])}
                >
                  <option value="single">Single page (original)</option>
                  <option value="continuous">Continuous scroll</option>
                </select>
              )}
            </Field>
            <fieldset className="demo-stack">
              <legend>Opt-in features</legend>
              {(
                [
                  ['textLayer', 'Text layer'],
                  ['annotationLayer', 'Links (annotation layer)'],
                  ['search', 'Search'],
                  ['thumbnails', 'Thumbnails'],
                  ['pageInput', 'Page number input'],
                  ['zoomReset', 'Zoom reset button'],
                  ['wheelZoom', 'Ctrl/⌘ + wheel zoom'],
                  ['passwordPrompt', 'Password prompt'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="demo-check">
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={(event) => set(key, event.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <label className="demo-check">
              <input
                type="checkbox"
                checked={options.keyboardShortcuts}
                onChange={(event) => set('keyboardShortcuts', event.target.checked)}
              />
              Keyboard shortcuts
            </label>
            <Field label="Print mode">
              {(id) => (
                <select
                  id={id}
                  value={options.printMode}
                  onChange={(event) => set('printMode', event.target.value as Options['printMode'])}
                >
                  <option value="render">Render (print dialog)</option>
                  <option value="open-url">Open URL (original)</option>
                </select>
              )}
            </Field>
            <Field
              label={`Compact breakpoint: ${options.compactBreakpoint}px`}
              hint="Compact mode follows the window width (original behavior). Raise the breakpoint above your window width to preview it."
            >
              {(id) => (
                <input
                  id={id}
                  type="range"
                  min={320}
                  max={2560}
                  step={10}
                  value={options.compactBreakpoint}
                  onChange={(event) => set('compactBreakpoint', Number(event.target.value))}
                />
              )}
            </Field>
            <Field label={`Container width: ${options.containerWidth}px`}>
              {(id) => (
                <input
                  id={id}
                  type="range"
                  min={320}
                  max={1400}
                  step={10}
                  value={options.containerWidth}
                  onChange={(event) => set('containerWidth', Number(event.target.value))}
                />
              )}
            </Field>
            <Field label="Theme">
              {(id) => (
                <select
                  id={id}
                  value={options.theme}
                  onChange={(event) => set('theme', event.target.value as Options['theme'])}
                >
                  <option value="default">Default</option>
                  <option value="dark">Dark preset</option>
                  <option value="custom">Custom colors</option>
                </select>
              )}
            </Field>
            {options.theme === 'custom' && (
              <div className="demo-grid-2">
                <Field label="Toolbar">
                  {(id) => (
                    <input
                      id={id}
                      type="color"
                      value={options.toolbarColor}
                      onChange={(event) => set('toolbarColor', event.target.value)}
                    />
                  )}
                </Field>
                <Field label="Accent">
                  {(id) => (
                    <input
                      id={id}
                      type="color"
                      value={options.accentColor}
                      onChange={(event) => set('accentColor', event.target.value)}
                    />
                  )}
                </Field>
              </div>
            )}
            <Field label="Language">
              {(id) => (
                <select
                  id={id}
                  value={options.language}
                  onChange={(event) => set('language', event.target.value as Options['language'])}
                >
                  <option value="en">English</option>
                  <option value="hu">Magyar (Hungarian)</option>
                </select>
              )}
            </Field>
            <button
              type="button"
              className="demo-button"
              onClick={() => {
                setOptions(PARITY_DEFAULTS);
                setFullscreen(false);
              }}
            >
              Reset to parity defaults
            </button>
          </div>
        </section>
      </aside>

      <div className="demo-content">
        <h1 className="demo-title">Playground</h1>
        <p className="demo-hint" aria-live="polite">
          Showing: <strong>{selection.label}</strong>
        </p>
        <div
          className={parentFullscreen ? 'demo-stage demo-stage--fullscreen' : 'demo-stage'}
          style={stageStyle}
        >
          <PdfViewer
            key={options.controlled ? 'controlled' : 'uncontrolled'}
            ref={viewer}
            source={selection.source}
            className={themeClass || undefined}
            {...stateProps}
            {...(options.fullscreenMode === 'controlled'
              ? { fullscreen, fullscreenMode: 'controlled' as const }
              : { fullscreenMode: options.fullscreenMode })}
            toolbar={{ position: options.toolbarPosition }}
            fitMode={options.fitMode}
            zoomLevels={options.zoomPresets ? ZOOM_PRESETS : undefined}
            layout={options.layout}
            textLayer={options.textLayer}
            annotationLayer={options.annotationLayer}
            search={options.search}
            thumbnails={options.thumbnails}
            pageInput={options.pageInput}
            zoomReset={options.zoomReset}
            wheelZoom={options.wheelZoom}
            passwordPrompt={options.passwordPrompt}
            keyboardShortcuts={options.keyboardShortcuts}
            printMode={options.printMode}
            compactBreakpoint={options.compactBreakpoint}
            labels={options.language === 'hu' ? hungarianLabels : undefined}
            locale={options.language === 'hu' ? 'hu-HU' : undefined}
            onDocumentLoad={(info) => log('onDocumentLoad', info)}
            onPageChange={(value) => {
              log('onPageChange', value);
              setPage(value);
            }}
            onScaleChange={(value) => {
              log('onScaleChange', value);
              setScale(value);
            }}
            onRotationChange={(value) => {
              log('onRotationChange', value);
              setRotation(value);
            }}
            onFullscreenChange={(value) => {
              log('onFullscreenChange', value);
              setFullscreen(value);
            }}
            onPageRender={(info) =>
              log('onPageRender', { ...info, durationMs: Math.round(info.durationMs) })
            }
            onError={(error) => {
              log('onError', { code: error.code, status: error.status, message: error.message });
              setLastError(error.code);
            }}
            onDownload={({ fileName }) => log('onDownload', { fileName })}
            onPrint={() => log('onPrint')}
          />
        </div>

        <section className="demo-panel" aria-labelledby="api-heading">
          <h2 id="api-heading">Imperative API</h2>
          <div className="demo-row demo-wrap">
            <label className="demo-inline-field">
              Page
              <input
                type="number"
                min={1}
                value={goTo}
                onChange={(event) => setGoTo(Number(event.target.value) || 1)}
              />
            </label>
            <button
              type="button"
              className="demo-button"
              onClick={() => viewer.current?.goToPage(goTo)}
            >
              goToPage({goTo})
            </button>
            <button type="button" className="demo-button" onClick={() => viewer.current?.zoomIn()}>
              zoomIn()
            </button>
            <button
              type="button"
              className="demo-button"
              onClick={() => viewer.current?.rotate('ccw')}
            >
              rotate(&apos;ccw&apos;)
            </button>
            <button
              type="button"
              className="demo-button"
              onClick={() => void viewer.current?.download()}
            >
              download()
            </button>
            <button
              type="button"
              className="demo-button"
              onClick={() => void viewer.current?.print()}
            >
              print()
            </button>
            <button type="button" className="demo-button" onClick={() => viewer.current?.reload()}>
              reload()
            </button>
          </div>
        </section>

        <EventLog entries={entries} onClear={clear} />
      </div>

      {dragging && (
        <div className="demo-drop-overlay" aria-hidden="true">
          Drop the PDF to open it
        </div>
      )}
    </div>
  );
}
