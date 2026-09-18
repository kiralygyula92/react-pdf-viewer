import '@kiralygyula92/react-pdf-viewer/styles.css';
import { DemoToolbar } from 'ppds-kit/client/DemoToolbar';
import { useState } from 'react';
import '../pdfjs';
import '../styles/demos.css';
import { Playground } from './Playground';

/** Mounts a Demos scenario with the demo toolbar (no sandbox: it uses site-only components). */
export default function ScenarioFrame({ title, source }: { title: string; source: string }) {
  const [generation, setGeneration] = useState(0);
  return (
    <DemoToolbar
      title={title}
      source={source}
      language="tsx"
      onReset={() => setGeneration((value) => value + 1)}
    >
      <Playground key={generation} />
    </DemoToolbar>
  );
}
