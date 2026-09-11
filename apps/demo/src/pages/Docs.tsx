import { useDeferredValue, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Tabs } from '../components/Tabs';
import {
  CSS_VAR_GROUPS,
  HEADLESS_TABLES,
  PKG,
  TABLES,
  VIEWER_PROP_GROUPS,
  type Row,
  type TableId,
} from '../docs/reference';
import { href, replaceRoute, useRoute } from '../router';

// ── Building blocks ─────────────────────────────────────────────────────────

const COLOR = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/i;

/** Renders reference text, turning `backtick` spans into code. */
function Text({ children }: { children: string }) {
  return (
    <>
      {children
        .split('`')
        .map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : part))}
    </>
  );
}

function matches(row: Row, query: string): boolean {
  if (!query) return true;
  return [row.name, row.type, row.default, row.description].some((value) =>
    value?.toLowerCase().includes(query),
  );
}

function countMatches(ids: readonly TableId[], query: string): number {
  return ids.reduce((sum, id) => sum + TABLES[id].filter((row) => matches(row, query)).length, 0);
}

function DefaultValue({ value }: { value: string | undefined }) {
  if (value === undefined) return <span className="demo-table__empty">—</span>;
  const color = COLOR.exec(value)?.[0];
  return (
    <code>
      {color && <span className="demo-swatch" style={{ background: color }} />}
      {value}
    </code>
  );
}

/** A reference table; hidden entirely while a filter matches none of its rows. */
function RefTable({
  id,
  query,
  title,
  intro,
  nameHeader = 'Name',
}: {
  id: TableId;
  query: string;
  title?: string | undefined;
  intro?: string | undefined;
  nameHeader?: string | undefined;
}) {
  const rows = TABLES[id];
  const visible = rows.filter((row) => matches(row, query));
  if (visible.length === 0) return null;
  const hasType = rows.some((row) => row.type !== undefined);
  const hasDefault = rows.some((row) => row.default !== undefined);
  return (
    <>
      {title && <h3>{title}</h3>}
      {intro && (
        <p>
          <Text>{intro}</Text>
        </p>
      )}
      <div className="demo-table-wrap">
        <table className="demo-table">
          <caption className="demo-sr-only">{title ?? nameHeader}</caption>
          <thead>
            <tr>
              <th scope="col">{nameHeader}</th>
              {hasType && <th scope="col">Type</th>}
              {hasDefault && <th scope="col">Default</th>}
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.name}>
                <td>
                  <code data-css-var={row.cssVar ? row.name : undefined}>{row.name}</code>
                  {row.tag && <span className="demo-pill">{row.tag}</span>}
                </td>
                {/* data-label heads the cell when rows stack into cards on narrow screens. */}
                {hasType && (
                  <td data-label="Type">
                    {row.type !== undefined && <code className="demo-type">{row.type}</code>}
                  </td>
                )}
                {hasDefault && (
                  <td data-label="Default" data-empty={row.default === undefined ? '' : undefined}>
                    <DefaultValue value={row.default} />
                  </td>
                )}
                <td>
                  <Text>{row.description}</Text>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** A code listing with a copy button. */
function Code({ children }: { children: string }) {
  const code = children.replace(/^\n/, '').trimEnd();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard unavailable (insecure context): the text can still be selected.
    }
  };

  return (
    <div className="demo-code">
      <pre>
        <code>{code}</code>
      </pre>
      <button type="button" className="demo-code__copy" onClick={() => void copy()}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span className="demo-sr-only" aria-live="polite">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </div>
  );
}

function CodeTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: { id: string; label: string; code: string }[];
}) {
  const [selected, setSelected] = useState(tabs[0]?.id ?? '');
  return (
    <Tabs
      label={label}
      selected={selected}
      onSelect={setSelected}
      tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label, content: <Code>{tab.code}</Code> }))}
    />
  );
}

/** Links to another section of this page. */
function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <a
      href={href('/docs', { s: to })}
      onClick={(event) => {
        event.preventDefault();
        goToSection(to);
      }}
    >
      {children}
    </a>
  );
}

/** The section last navigated to, so the page's own route updates do not scroll it again. */
let currentSection: string | null = null;

function goToSection(id: string, smooth = true) {
  const section = document.getElementById(`docs-${id}`);
  // A section hidden by the filter is retried once the filter gives way (see `Docs`).
  if (!section || section.hidden) return;
  currentSection = id;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
  document.getElementById(`docs-${id}-title`)?.focus({ preventScroll: true });
  replaceRoute('/docs', { s: id });
}

// ── Code samples ────────────────────────────────────────────────────────────

const SAMPLE = {
  quickStart: `
import { PdfViewer } from '${PKG}';
import '${PKG}/styles.css';

export function Report() {
  return <PdfViewer source="/files/report.pdf" />;
}`,
  extras: `
<PdfViewer
  source={file}
  layout="continuous"
  thumbnails
  search
  pageInput
  zoomReset
  annotationLayer
  wheelZoom
  className="rpv-theme-auto"
/>`,
  vite: `
import { configurePdfJs } from '${PKG}';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

configurePdfJs({
  workerSrc,
  cMapUrl: '/pdfjs/cmaps/',
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  wasmUrl: '/pdfjs/wasm/',
  iccUrl: '/pdfjs/iccs/',
});

// vite.config.ts: copy the asset folders with vite-plugin-static-copy
viteStaticCopy({
  targets: ['cmaps', 'standard_fonts', 'wasm', 'iccs'].map((dir) => ({
    src: \`node_modules/pdfjs-dist/\${dir}\`,
    dest: 'pdfjs',
  })),
});`,
  webpack: `
// A client module ('use client' in Next.js), imported once.
import { configurePdfJs } from '${PKG}';

configurePdfJs({
  workerSrc: new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString(),
});`,
  legacy: `
configurePdfJs({
  loader: () => import('pdfjs-dist/legacy/build/pdf.mjs'),
  workerSrc: legacyWorkerUrl, // pdfjs-dist/legacy/build/pdf.worker.min.mjs
});`,
  request: `
<PdfViewer
  source="https://api.example.com/reports/42.pdf"
  requestInit={{ credentials: 'include', headers: { 'X-Tenant': tenantId } }}
  onHttpError={(response) => {
    if (response.status === 401) {
      signIn();
      return true; // handled: empty state, no error view, no onError
    }
  }}
  getHttpErrorMessage={async (response) =>
    response.status === 404 ? 'This report no longer exists.' : undefined
  }
/>`,
  fetcher: `
<PdfViewer source={url} fetcher={(input, init) => api.raw(input, init)} />`,
  file: `
function LocalFile() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <>
      <input
        type="file"
        accept="application/pdf"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      {/* Kept in state: binary sources compare by identity. */}
      <PdfViewer source={file} />
    </>
  );
}`,
  controlled: `
function Report({ url }: { url: string }) {
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  return (
    <>
      <button type="button" onClick={() => setPage(1)}>Back to the cover</button>
      <PdfViewer
        source={url}
        page={page}
        onPageChange={setPage}
        scale={scale}
        onScaleChange={setScale}
        defaultRotation={90} /* uncontrolled: the viewer keeps it */
      />
    </>
  );
}`,
  fullscreen: `
const [fullscreen, setFullscreen] = useState(false);

<PdfViewer
  source={url}
  fullscreen={fullscreen}
  onFullscreenChange={setFullscreen}
  fullscreenMode="overlay" // or 'native'; 'controlled' (the default here) leaves presentation to you
/>`,
  toolbarConfig: `
<PdfViewer
  source={url}
  toolbar={{
    position: 'top',
    actions: ['previousPage', 'pageIndicator', 'nextPage', 'zoomOut', 'zoomLevel', 'zoomIn', 'download'],
    hiddenWhenCompact: ['download'],
  }}
/>`,
  renderToolbar: `
import { PdfToolbar, PdfViewer } from '${PKG}';

<PdfViewer
  source={url}
  renderToolbar={(api) => (
    <div className="my-toolbar">
      <PdfToolbar api={api} config={{ actions: ['zoomOut', 'zoomLevel', 'zoomIn'] }} />
      <span>
        Page {api.page} of {api.numPages}
      </span>
      <button type="button" onClick={() => void api.download()}>
        Save a copy
      </button>
    </div>
  )}
/>`,
  api: `
import { PdfViewer, type PdfViewerApi } from '${PKG}';

function Report({ url }: { url: string }) {
  const viewer = useRef<PdfViewerApi>(null);
  return (
    <>
      <button type="button" onClick={() => viewer.current?.goToPage(3)}>Summary</button>
      <button type="button" onClick={() => void viewer.current?.print()}>Print</button>
      <PdfViewer ref={viewer} source={url} />
    </>
  );
}`,
  errors: `
<PdfViewer
  source={url}
  onError={(error) => logger.warn(error.code, error.message, error.cause)}
  renderError={(error, { retry }) => (
    <div role="alert">
      <p>{error.message}</p>
      {error.code === 'HTTP_ERROR' && <p>Status: {error.status}</p>}
      <button type="button" onClick={retry}>Try again</button>
    </div>
  )}
/>`,
  labels: `
// Module scope: a stable object (labels are merged once per identity).
const hungarian = {
  zoomIn: 'Nagyítás',
  zoomOut: 'Kicsinyítés',
  moreActions: 'További műveletek',
  pageAriaLabel: (page, total, { formatNumber }) =>
    formatNumber(page) + '. oldal, összesen ' + formatNumber(total),
} satisfies Partial<PdfViewerLabels>;

<PdfViewer source={url} locale="hu-HU" labels={hungarian} />`,
  theming: `
/* Your CSS: unlayered rules always beat the viewer's @layer rpv. */
.report-viewer {
  --rpv-toolbar-bg: #1f2937;
  --rpv-toolbar-radius: 999px;
  --rpv-accent: #7c3aed;
  --rpv-page-radius: 12px;
}

.report-viewer[data-status='error'] {
  --rpv-toolbar-bg: #7f1d1d;
}`,
  hostStyles: `
/* Scope bare element rules so they skip the viewer. */
:where(button):not(.rpv-root *) {
  background: var(--brand-surface);
}`,
  headless: `
import { PdfPageCanvas, usePdfDocument } from '${PKG}';

function Thumbnails({ source }: { source: string }) {
  const { status, document, numPages, error, reload } = usePdfDocument(source);
  if (status === 'error') return <button onClick={reload}>{error?.message} (retry)</button>;
  if (status !== 'ready' || !document) return null;
  return Array.from({ length: numPages }, (_, index) => (
    <PdfPageCanvas
      key={index}
      document={document}
      page={index + 1}
      fit={{ width: 160 }}
      aria-label={'Page ' + (index + 1)}
    />
  ));
}`,
  controllable: `
import { useControllableState } from '${PKG}';

function Stepper(props: { value?: number; defaultValue?: number; onValueChange?: (v: number) => void }) {
  const [value, setValue] = useControllableState({
    value: props.value,
    defaultValue: props.defaultValue ?? 0,
    onChange: props.onValueChange,
    name: 'value',
  });
  return <button onClick={() => setValue((previous) => previous + 1)}>{value}</button>;
}`,
  next: `
// app/reports/[id]/page.tsx (a Server Component)
import { PdfViewer } from '${PKG}';
import '${PKG}/styles.css';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PdfViewer source={'/api/reports/' + id + '.pdf'} />;
}`,
  compat: `
import { CustomPdfViewer } from '${PKG}/compat';
import '${PKG}/styles.css';

<CustomPdfViewer
  {...pdfViewerProps}
  onUnauthorized={() => {
    useAuthStore.getState().purgeStoreData();
    window.location.replace('/auth/sign-in');
  }}
/>`,
};

// ── Sections ────────────────────────────────────────────────────────────────

interface SectionProps {
  query: string;
}

function Overview() {
  return (
    <>
      <p>
        An accessible, themeable React PDF viewer built on PDF.js (<code>pdfjs-dist</code>). With
        default props it reproduces the original <code>CustomPdfViewer</code> exactly: toolbar below
        the page, one page at a time, 5% zoom steps between 25% and 500%. Everything beyond that is
        opt-in and marked <span className="demo-pill">opt-in</span> in this reference.
      </p>
      <ul className="demo-docs__cards">
        <li>
          <strong>Any source</strong>
          URL strings, <code>URL</code>, <code>ArrayBuffer</code>, <code>Uint8Array</code>,{' '}
          <code>Blob</code> and <code>File</code>.
        </li>
        <li>
          <strong>Controlled or not</strong>
          Page, scale, rotation and fullscreen each have <code>x</code> / <code>defaultX</code> /{' '}
          <code>onXChange</code>.
        </li>
        <li>
          <strong>Robust</strong>
          Cancellable renders, aborted loads, typed errors with retry, HiDPI with a pixel budget.
        </li>
        <li>
          <strong>Accessible</strong>
          WAI-ARIA toolbar and menu, keyboard shortcuts, live page announcements, visible focus.
        </li>
        <li>
          <strong>Themeable</strong>
          Plain CSS in a cascade layer, 50+ CSS variables, light, dark and auto presets.
        </li>
        <li>
          <strong>Composable</strong>
          Batteries-included <code>PdfViewer</code>, or build your own with{' '}
          <code>usePdfDocument</code> and <code>PdfPageCanvas</code>.
        </li>
      </ul>
    </>
  );
}

function Installation({ query }: SectionProps) {
  return (
    <>
      <CodeTabs
        label="Package manager"
        tabs={[
          { id: 'pnpm', label: 'pnpm', code: `pnpm add ${PKG} pdfjs-dist` },
          { id: 'npm', label: 'npm', code: `npm install ${PKG} pdfjs-dist` },
          { id: 'yarn', label: 'yarn', code: `yarn add ${PKG} pdfjs-dist` },
        ]}
      />
      <p>
        Peer dependencies: <code>react</code> and <code>react-dom</code> 18 or 19, and{' '}
        <code>pdfjs-dist</code> ^6. The package is ESM-only, fully typed, and has no other runtime
        dependencies.
      </p>
      <p>
        <strong>Browser support:</strong> PDF.js 6 targets the latest two versions of Chrome, Edge,
        Firefox and Safari. For older browsers use the legacy build (see{' '}
        <SectionLink to="pdfjs">PDF.js setup</SectionLink>).
      </p>
      <RefTable id="entryPoints" query={query} title="Entry points" nameHeader="Import" />
    </>
  );
}

function QuickStart() {
  return (
    <>
      <Code>{SAMPLE.quickStart}</Code>
      <p>
        That is the whole integration. PDF.js is loaded lazily on first use, and its worker and
        assets come from a CDN pinned to your installed version until you{' '}
        <SectionLink to="pdfjs">self-host them</SectionLink>.
      </p>
      <h3>Turning on the extras</h3>
      <p>Each feature beyond the original viewer is a single prop:</p>
      <Code>{SAMPLE.extras}</Code>
    </>
  );
}

function PdfJsSetup({ query }: SectionProps) {
  return (
    <>
      <p>
        PDF.js needs a worker script plus CMaps, standard fonts, WebAssembly decoders and ICC
        profiles. Out of the box the viewer loads them from jsDelivr, pinned to the{' '}
        <strong>exact installed</strong> <code>pdfjs-dist</code> version, and logs a one-time
        development notice. For production, self-host them and call <code>configurePdfJs</code> once
        at startup, before the first viewer renders.
      </p>
      <CodeTabs
        label="Bundler"
        tabs={[
          { id: 'vite', label: 'Vite', code: SAMPLE.vite },
          { id: 'webpack', label: 'webpack 5 / Next.js', code: SAMPLE.webpack },
          { id: 'legacy', label: 'Older browsers', code: SAMPLE.legacy },
        ]}
      />
      <p className="demo-callout">
        <strong>Content Security Policy:</strong> <code>worker-src</code> must allow the worker
        origin (or <code>blob:</code> when you pass a <code>workerPort</code>), and{' '}
        <code>connect-src</code> must allow the asset URLs.
      </p>
      <RefTable
        id="pdfjsConfig"
        query={query}
        title="configurePdfJs(options)"
        nameHeader="Option"
      />
    </>
  );
}

function LoadingDocuments() {
  return (
    <>
      <p>
        <code>source</code> accepts a <code>PdfSource</code>: a URL string or <code>URL</code>,
        which the viewer fetches, or binary data (<code>ArrayBuffer</code>, <code>Uint8Array</code>,{' '}
        <code>Blob</code>, <code>File</code>), which is read locally and never uploaded.{' '}
        <code>null</code>, <code>undefined</code> and <code>&apos;&apos;</code> show the empty
        state. Changing the source aborts the previous request and destroys the previous document.
      </p>
      <h3>Requests, authentication and HTTP errors</h3>
      <p>
        URL sources go through <code>fetch</code> and reach PDF.js as bytes, so the viewer can
        report HTTP statuses and you can shape the request:
      </p>
      <Code>{SAMPLE.request}</Code>
      <p>
        To use your own HTTP client (an authenticated <code>ky</code> or <code>axios</code>{' '}
        instance), pass a <code>fetcher</code>:
      </p>
      <Code>{SAMPLE.fetcher}</Code>
      <p className="demo-callout">
        <strong>CORS still applies.</strong> A cross-origin PDF needs{' '}
        <code>Access-Control-Allow-Origin</code> for your origin; cookies additionally need{' '}
        <code>credentials: &apos;include&apos;</code> and{' '}
        <code>Access-Control-Allow-Credentials: true</code>. A blocked request surfaces as a{' '}
        <code>NETWORK_ERROR</code>. When you cannot change the server, proxy the file through your
        own origin.
      </p>
      <h3>Local files</h3>
      <p>
        Strings compare by value; every other source compares by identity. Keep binary sources in
        state rather than creating them during render, or the document reloads on every render.
      </p>
      <Code>{SAMPLE.file}</Code>
      <h3>Encrypted documents</h3>
      <p>
        Pass <code>password</code> when you know it, or set <code>passwordPrompt</code> to ask the
        user (replace the form with <code>renderPasswordPrompt</code>). Without either, the viewer
        reports <code>PASSWORD_REQUIRED</code>.
      </p>
    </>
  );
}

function Props({ query }: SectionProps) {
  return (
    <>
      <p>
        Every prop is optional except <code>source</code>. Badges:{' '}
        <span className="demo-pill">required</span>, <span className="demo-pill">controlled</span>{' '}
        (pair it with its <code>onXChange</code>; see{' '}
        <SectionLink to="controlled">Controlled state</SectionLink>) and{' '}
        <span className="demo-pill">opt-in</span> (new behaviour, off by default). The component
        also accepts a <code>ref</code> to the <SectionLink to="api">imperative API</SectionLink>.
      </p>
      {VIEWER_PROP_GROUPS.map((group) => (
        <RefTable
          key={group.id}
          id={group.id}
          query={query}
          title={group.title}
          intro={group.intro}
          nameHeader="Prop"
        />
      ))}
    </>
  );
}

function ControlledState() {
  return (
    <>
      <p>
        Page, scale, rotation and fullscreen follow one pattern: <code>x</code> controls the value,{' '}
        <code>defaultX</code> sets its initial value while uncontrolled, and <code>onXChange</code>{' '}
        reports every change in both modes. Leave <code>x</code> undefined to let the viewer own the
        state. Mix freely: control the page, leave the rotation to the viewer.
      </p>
      <Code>{SAMPLE.controlled}</Code>
      <ul className="demo-list">
        <li>
          Out-of-range values are clamped:{' '}
          <code>
            page={'{'}99{'}'}
          </code>{' '}
          on a 3-page document shows page 3 and calls <code>onPageChange(3)</code>.
        </li>
        <li>
          Scales are clamped to <code>[minScale, maxScale]</code>; <code>defaultScale</code> is also
          the reset target.
        </li>
        <li>
          A new source opens on <code>defaultPage</code>.
        </li>
        <li>Switching a value between controlled and uncontrolled logs a development warning.</li>
      </ul>
      <h3>Fullscreen</h3>
      <p>
        Passing <code>fullscreen</code> selects <code>fullscreenMode=&quot;controlled&quot;</code>:
        the viewer switches to its fullscreen layout and you present it (the original behaviour,
        e.g. inside a dialog). Choose <code>native</code> (Fullscreen API) or <code>overlay</code>{' '}
        (a fixed layer with a focus trap) to let the viewer present it.
      </p>
      <Code>{SAMPLE.fullscreen}</Code>
    </>
  );
}

function Toolbar({ query }: SectionProps) {
  return (
    <>
      <p>
        The toolbar groups its controls into zoom, page navigation and actions. It is always a
        single row: when it does not fit the viewer&apos;s width, the actions (fullscreen, rotate,
        download, print) move into a <strong>⋮ More actions</strong> menu, and on very narrow
        viewers the zoom controls follow. Page navigation always stays visible. The menu opens away
        from the nearest edge, so it works with the toolbar at the top or the bottom.
      </p>
      <Code>{SAMPLE.toolbarConfig}</Code>
      <RefTable id="toolbarConfig" query={query} title="ToolbarConfig" nameHeader="Field" />
      <RefTable id="toolbarActions" query={query} title="ToolbarAction" nameHeader="Action" />
      <h3>A custom toolbar</h3>
      <p>
        <code>renderToolbar</code> receives the <SectionLink to="api">viewer API</SectionLink>.
        Build your own controls, or reuse <code>PdfToolbar</code> for parts of it:
      </p>
      <Code>{SAMPLE.renderToolbar}</Code>
    </>
  );
}

function ImperativeApi({ query }: SectionProps) {
  return (
    <>
      <p>
        A <code>ref</code> on <code>PdfViewer</code> exposes <code>PdfViewerApi</code>; the same
        object is passed to <code>renderToolbar</code>. Its values are a snapshot of the render that
        produced it, so read them from the latest object.
      </p>
      <Code>{SAMPLE.api}</Code>
      <RefTable id="api" query={query} nameHeader="Member" />
    </>
  );
}

function Errors({ query }: SectionProps) {
  return (
    <>
      <p>
        Failures are reported as a typed <code>PdfViewerError</code>. Aborted loads and cancelled
        renders are never errors. The default error view offers Retry, and the toolbar stays usable
        so fullscreen can always be left.
      </p>
      <Code>{SAMPLE.errors}</Code>
      <RefTable id="errorFields" query={query} title="PdfViewerError" nameHeader="Field" />
      <RefTable id="errorCodes" query={query} title="PdfViewerErrorCode" nameHeader="Code" />
    </>
  );
}

function Labels({ query }: SectionProps) {
  return (
    <>
      <p>
        Every visible string and accessible name can be replaced through <code>labels</code>;
        unspecified keys keep the English defaults (exported as <code>defaultLabels</code>).
        Function labels receive a <code>{'{ formatNumber }'}</code> helper that formats with{' '}
        <code>locale</code>.
      </p>
      <Code>{SAMPLE.labels}</Code>
      <RefTable id="labels" query={query} title="PdfViewerLabels" nameHeader="Key" />
    </>
  );
}

function Theming({ query }: SectionProps) {
  return (
    <>
      <p>
        The stylesheet is plain CSS inside the <code>rpv</code> cascade layer, so your unlayered
        rules always win without <code>!important</code>. Every class is prefixed <code>rpv-</code>.
        Set CSS variables on the viewer (<code>className</code>, <code>style</code>) or on any
        ancestor:
      </p>
      <Code>{SAMPLE.theming}</Code>
      {CSS_VAR_GROUPS.map((group) => (
        <RefTable
          key={group.id}
          id={group.id}
          query={query}
          title={group.title}
          intro={group.intro}
          nameHeader="Variable"
        />
      ))}
      <RefTable
        id="darkPreset"
        query={query}
        title="Dark preset"
        intro='`className="rpv-theme-dark"` applies these values; `className="rpv-theme-auto"` applies them only when the operating system prefers a dark color scheme. The menu and search bar switch to dark surfaces as well.'
        nameHeader="Variable"
      />
      <RefTable
        id="dataAttributes"
        query={query}
        title="State attributes"
        intro="The root element (`.rpv-root`) reflects its state for styling."
        nameHeader="Attribute"
      />
      <h3>Host styles</h3>
      <p>
        Because the viewer&apos;s CSS is layered, unlayered host rules that target bare elements
        (for example <code>{'button { background: … }'}</code>) also apply inside the viewer. Scope
        them:
      </p>
      <Code>{SAMPLE.hostStyles}</Code>
    </>
  );
}

function Keyboard({ query }: SectionProps) {
  return (
    <>
      <p>
        Shortcuts are active while focus is inside the viewer, except while typing in a field or
        with <kbd>Alt</kbd>, <kbd>Ctrl</kbd> or <kbd>⌘</kbd> held. Turn them off with{' '}
        <code>keyboardShortcuts={'{false}'}</code>.
      </p>
      <RefTable id="keyboard" query={query} title="Viewer shortcuts" nameHeader="Keys" />
      <RefTable id="toolbarKeys" query={query} title="Toolbar and menu" nameHeader="Keys" />
      <h3>Accessibility</h3>
      <ul className="demo-list">
        <li>
          The viewer is a named region; the toolbar is a <code>role=&quot;toolbar&quot;</code> with
          a single tab stop and arrow-key navigation; the overflow menu follows the WAI-ARIA menu
          button pattern.
        </li>
        <li>
          Each page is an image named &quot;Page X of N&quot;; with <code>textLayer</code> it
          becomes a group containing real, selectable text.
        </li>
        <li>The page indicator is a polite live region; errors use an alert.</li>
        <li>
          Disabled controls use the <code>disabled</code> attribute; focus is always visible; the
          document area is keyboard-scrollable.
        </li>
        <li>
          The overlay fullscreen mode traps focus, closes with <kbd>Esc</kbd> and restores focus.
        </li>
        <li>The demo runs axe (WCAG 2.2 AA) against every screen in CI.</li>
      </ul>
    </>
  );
}

function Headless({ query }: SectionProps) {
  return (
    <>
      <p>
        <code>PdfViewer</code> is built from public pieces you can use directly:{' '}
        <code>usePdfDocument</code> loads a document (fetching, aborting, HTTP errors, cleanup) and{' '}
        <code>PdfPageCanvas</code> renders one page (cancellation, double buffering, HiDPI, text and
        annotation layers).
      </p>
      <Code>{SAMPLE.headless}</Code>
      {HEADLESS_TABLES.map((table) => (
        <RefTable
          key={table.id}
          id={table.id}
          query={query}
          title={table.title}
          intro={table.intro}
          nameHeader={table.nameHeader}
        />
      ))}
      <Code>{SAMPLE.controllable}</Code>
    </>
  );
}

function Exports({ query }: SectionProps) {
  return (
    <>
      <p>
        Everything the package exports. Types are exported as <code>type</code>-only.
      </p>
      <RefTable id="exports" query={query} nameHeader="Export" />
    </>
  );
}

function Ssr() {
  return (
    <>
      <p>
        Both entry points start with <code>&apos;use client&apos;</code> and touch no browser
        globals at import time, so they can be imported from Server Component files and rendered on
        the server; the server output is the loading state. PDF.js itself loads lazily in the
        browser. Call <code>configurePdfJs</code> from a client module.
      </p>
      <Code>{SAMPLE.next}</Code>
    </>
  );
}

function Security() {
  return (
    <ul className="demo-list">
      <li>
        The peer range (<code>pdfjs-dist</code> ^6) excludes versions affected by CVE-2024-4367
        (arbitrary JavaScript through crafted fonts), and <code>isEvalSupported: false</code> is
        passed as defense in depth.
      </li>
      <li>
        The viewer never injects <code>&lt;script&gt;</code> tags and never reads or writes globals
        such as <code>window.pdfjsLib</code>.
      </li>
      <li>
        External links in documents (<code>annotationLayer</code>) open in a new tab with{' '}
        <code>rel=&quot;noopener noreferrer&quot;</code>.
      </li>
      <li>Binary sources are read locally and never uploaded.</li>
    </ul>
  );
}

function Compat({ query }: SectionProps) {
  return (
    <>
      <p>
        The <code>/compat</code> entry exports a drop-in <code>CustomPdfViewer</code> with the
        original props. The one host coupling of the original, the hard-coded 401 redirect, becomes
        the <code>onUnauthorized</code> callback.
      </p>
      <Code>{SAMPLE.compat}</Code>
      <RefTable id="compat" query={query} title="CustomPdfViewer props" nameHeader="Prop" />
      <h3>What changes (all fixes)</h3>
      <ul className="demo-list">
        <li>Renders are cancellable and sharp on HiDPI screens.</li>
        <li>Pages with an intrinsic rotation display upright.</li>
        <li>Errors keep the toolbar and offer Retry.</li>
        <li>Download reuses the loaded bytes instead of fetching again.</li>
        <li>Print opens the print dialog instead of a new tab.</li>
        <li>The fullscreen icon reflects the state.</li>
        <li>
          Narrow toolbars collapse actions into a &quot;More actions&quot; menu instead of clipping
          them.
        </li>
        <li>In fullscreen the document area shrinks so the toolbar is always on screen.</li>
      </ul>
      <p>
        To match the host theme, set <code>--rpv-toolbar-bg</code> and <code>--rpv-accent</code> on
        a wrapper element.
      </p>
    </>
  );
}

interface SectionSpec {
  id: string;
  title: string;
  group: 'Getting started' | 'Reference' | 'Advanced';
  tables: readonly TableId[];
  Body: ComponentType<SectionProps>;
}

const SECTIONS: readonly SectionSpec[] = [
  { id: 'overview', title: 'Overview', group: 'Getting started', tables: [], Body: Overview },
  {
    id: 'install',
    title: 'Installation',
    group: 'Getting started',
    tables: ['entryPoints'],
    Body: Installation,
  },
  {
    id: 'quick-start',
    title: 'Quick start',
    group: 'Getting started',
    tables: [],
    Body: QuickStart,
  },
  {
    id: 'pdfjs',
    title: 'PDF.js setup',
    group: 'Getting started',
    tables: ['pdfjsConfig'],
    Body: PdfJsSetup,
  },
  {
    id: 'sources',
    title: 'Loading documents',
    group: 'Getting started',
    tables: [],
    Body: LoadingDocuments,
  },
  {
    id: 'props',
    title: 'PdfViewer props',
    group: 'Reference',
    tables: VIEWER_PROP_GROUPS.map((group) => group.id),
    Body: Props,
  },
  {
    id: 'controlled',
    title: 'Controlled state',
    group: 'Reference',
    tables: [],
    Body: ControlledState,
  },
  {
    id: 'toolbar',
    title: 'Toolbar',
    group: 'Reference',
    tables: ['toolbarConfig', 'toolbarActions'],
    Body: Toolbar,
  },
  { id: 'api', title: 'Imperative API', group: 'Reference', tables: ['api'], Body: ImperativeApi },
  {
    id: 'errors',
    title: 'Errors',
    group: 'Reference',
    tables: ['errorFields', 'errorCodes'],
    Body: Errors,
  },
  { id: 'labels', title: 'Labels and i18n', group: 'Reference', tables: ['labels'], Body: Labels },
  {
    id: 'theming',
    title: 'Theming',
    group: 'Reference',
    tables: [...CSS_VAR_GROUPS.map((group) => group.id), 'darkPreset', 'dataAttributes'],
    Body: Theming,
  },
  {
    id: 'keyboard',
    title: 'Keyboard and accessibility',
    group: 'Reference',
    tables: ['keyboard', 'toolbarKeys'],
    Body: Keyboard,
  },
  {
    id: 'headless',
    title: 'Headless API',
    group: 'Advanced',
    tables: HEADLESS_TABLES.map((table) => table.id),
    Body: Headless,
  },
  { id: 'exports', title: 'All exports', group: 'Advanced', tables: ['exports'], Body: Exports },
  { id: 'ssr', title: 'SSR and Next.js', group: 'Advanced', tables: [], Body: Ssr },
  { id: 'security', title: 'Security', group: 'Advanced', tables: [], Body: Security },
  {
    id: 'compat',
    title: 'Migrating from CustomPdfViewer',
    group: 'Advanced',
    tables: ['compat'],
    Body: Compat,
  },
];

const NAV_GROUPS = ['Getting started', 'Reference', 'Advanced'] as const;
const ALL_TABLES = SECTIONS.flatMap((section) => section.tables);

// ── Page ────────────────────────────────────────────────────────────────────

/** Whether filtering by `text` hides the section `id`. */
function hidesSection(text: string, id: string | null): boolean {
  const query = text.trim().toLowerCase();
  const section = SECTIONS.find((candidate) => candidate.id === id);
  return query !== '' && section !== undefined && countMatches(section.tables, query) === 0;
}

/** The package documentation: guides plus a filterable reference of the whole public API. */
export function Docs() {
  // Deep link: `#/docs?s=theming` opens that section, on load and on later hash changes
  // (a pasted link, Back / Forward).
  const target = useRoute().params.get('s');

  // The filter remembers the section it was typed on, so a link to a section it would hide
  // wins over it instead of scrolling to nothing.
  const [filterState, setFilterState] = useState({ text: '', target });
  const filter =
    filterState.target !== target && hidesSection(filterState.text, target) ? '' : filterState.text;
  const setFilter = (text: string) => setFilterState({ text, target });
  const query = useDeferredValue(filter.trim().toLowerCase());
  const [active, setActive] = useState<string>('overview');

  const visibleSections = SECTIONS.filter(
    (section) => !query || countMatches(section.tables, query) > 0,
  );
  const total = query ? countMatches(ALL_TABLES, query) : 0;

  // Re-run when the (deferred) query changes: the target may only now have become visible.
  useEffect(() => {
    if (target && target !== currentSection) goToSection(target, false);
  }, [target, query]);
  useEffect(
    () => () => {
      currentSection = null;
    },
    [],
  );

  // Scroll spy: the first section intersecting the top third of the viewport is current.
  useEffect(() => {
    const intersecting = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) intersecting.set(entry.target.id, entry.isIntersecting);
        const current = SECTIONS.find((section) => intersecting.get(`docs-${section.id}`));
        if (current) setActive(current.id);
      },
      { rootMargin: '0px 0px -66% 0px' },
    );
    for (const section of SECTIONS) {
      const element = document.getElementById(`docs-${section.id}`);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="demo-docs">
      <aside className="demo-docs__aside">
        <form
          className="demo-docs__filter"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="docs-filter" className="demo-sr-only">
            Filter the reference
          </label>
          <input
            id="docs-filter"
            type="search"
            placeholder="Filter props, variables, labels…"
            autoComplete="off"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <p className="demo-docs__status" role="status">
            {query ? `${String(total)} ${total === 1 ? 'match' : 'matches'}` : ''}
          </p>
        </form>
        <nav className="demo-docs__nav" aria-label="Documentation">
          {NAV_GROUPS.map((group) => {
            const items = visibleSections.filter((section) => section.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <p className="demo-docs__nav-group">{group}</p>
                <ul>
                  {items.map((section) => (
                    <li key={section.id}>
                      <a
                        href={href('/docs', { s: section.id })}
                        aria-current={active === section.id ? 'true' : undefined}
                        onClick={(event) => {
                          event.preventDefault();
                          goToSection(section.id);
                        }}
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="demo-docs__content">
        <h1 className="demo-title">Documentation</h1>
        <p className="demo-docs__lead">
          How to install, configure and extend <code>{PKG}</code>: guides, every prop, the
          imperative API, labels, CSS variables and the headless building blocks. The package name
          is a placeholder until the owner publishes it.
        </p>
        {query && total === 0 && (
          <p className="demo-callout">Nothing in the reference matches “{filter.trim()}”.</p>
        )}
        {SECTIONS.map(({ id, title, Body, tables }) => (
          <section
            key={id}
            id={`docs-${id}`}
            className="demo-doc-section"
            aria-labelledby={`docs-${id}-title`}
            hidden={query !== '' && countMatches(tables, query) === 0}
          >
            <h2 id={`docs-${id}-title`} tabIndex={-1}>
              {title}
            </h2>
            <Body query={query} />
          </section>
        ))}
      </div>
    </div>
  );
}
