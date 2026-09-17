/** A Demos scenario (archetype L): the live, full-width app with the standard demo toolbar. */
import playgroundSource from '../islands/Playground.tsx?raw';
import { Island } from './Island.tsx';

export function Scenario({ name, title }: { name: 'playground'; title: string }) {
  return (
    <div className="demo-root ppds-scenario" data-scenario={name}>
      <Island name="scenario" props={{ title, source: playgroundSource }} />
      <noscript>
        <p>This interactive demo needs JavaScript.</p>
      </noscript>
    </div>
  );
}
