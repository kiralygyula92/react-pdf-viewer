import { Docs } from './pages/Docs';
import { Examples } from './pages/Examples';
import { Harness } from './pages/Harness';
import { Playground } from './pages/Playground';
import { StandaloneViewer } from './pages/StandaloneViewer';
import { Link, useRoute } from './router';

const PAGES = [
  { path: '/', label: 'Playground', Component: Playground },
  { path: '/view', label: 'Viewer', Component: StandaloneViewer },
  { path: '/examples', label: 'Examples', Component: Examples },
  { path: '/docs', label: 'Docs', Component: Docs },
] as const;

export function App() {
  const { path } = useRoute();

  // The test harness renders without demo chrome, for deterministic screenshots.
  if (path === '/harness') {
    return <Harness />;
  }

  const page = PAGES.find((candidate) => candidate.path === path);
  return (
    <div className="demo">
      <a
        className="demo-skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="demo-header">
        <a className="demo-brand" href="#/">
          react-pdf-viewer <span className="demo-brand__tag">demo</span>
        </a>
        <nav aria-label="Main">
          <ul className="demo-nav">
            {PAGES.map(({ path: to, label }) => (
              <li key={to}>
                <Link to={to} current={to === path}>
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/harness">Test harness</Link>
            </li>
          </ul>
        </nav>
      </header>
      <main id="main" className="demo-main" tabIndex={-1}>
        {page ? (
          <page.Component />
        ) : (
          <section className="demo-panel">
            <h1>Page not found</h1>
            <p>
              <Link to="/">Back to the playground</Link>
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
