/**
 * A live demo colocated with its page: `<Demo id="features/zoom/demo-basics" title="…" />`
 * renders `content/react-pdf-viewer/features/zoom/demo-basics.tsx` with the standard toolbar.
 * Without JavaScript the source is shown instead.
 */
import { demoSource } from '../content.ts';
import { Island } from './Island.tsx';

export function Demo({ id, title }: { id: string; title: string }) {
  const source = demoSource(id);
  return (
    <div className="demo-root ppds-demo-host" data-demo={id}>
      <Island name="demo" props={{ id, title, source }} />
      <noscript>
        <pre>
          <code>{source}</code>
        </pre>
      </noscript>
    </div>
  );
}
