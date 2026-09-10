import type { ComponentType } from 'react';
import { useInView } from '../components/useInView';

interface ExampleModule {
  default: ComponentType;
  meta: { title: string; description: string };
}

const modules = import.meta.glob<ExampleModule>('../examples/*.tsx', { eager: true });
// The same files as raw text: the listing shown is exactly the code running above it.
const sources = import.meta.glob<string>('../examples/*.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const examples = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, module]) => ({
    id: path.replace(/^.*\/|\.tsx$/g, ''),
    module,
    source: sources[path] ?? '',
  }));

function ExampleCard({ id, module, source }: (typeof examples)[number]) {
  const [ref, inView] = useInView<HTMLElement>();
  const Example = module.default;
  return (
    <section
      ref={ref}
      id={`example-${id}`}
      className="demo-panel demo-example"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`}>{module.meta.title}</h2>
      <p>{module.meta.description}</p>
      <div className="demo-example__live">
        {inView ? <Example /> : <p className="demo-hint">Loading example…</p>}
      </div>
      <details className="demo-source">
        <summary>Source</summary>
        <pre>
          <code>{source}</code>
        </pre>
      </details>
    </section>
  );
}

export function Examples() {
  return (
    <div className="demo-examples">
      <h1 className="demo-title">Examples</h1>
      <nav aria-label="Examples">
        <ol className="demo-toc">
          {examples.map(({ id, module }) => (
            <li key={id}>
              <button
                type="button"
                className="demo-link-button"
                onClick={() =>
                  document.getElementById(`example-${id}`)?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                {module.meta.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {examples.map((example) => (
        <ExampleCard key={example.id} {...example} />
      ))}
    </div>
  );
}
