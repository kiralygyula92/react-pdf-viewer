import '@kiralygyula92/react-pdf-viewer/styles.css';
import { DemoToolbar } from 'ppds-kit/react/DemoToolbar.tsx';
import { useState } from 'react';
import '../pdfjs';
import '../styles/demos.css';
import { Playground } from './Playground';
import { StandaloneViewer } from './StandaloneViewer';

/** Mounts a Demos scenario with the PPDS demo toolbar (no sandbox: it uses site-only components). */
export default function ScenarioFrame({
  name,
  title,
  source,
}: {
  name: 'playground' | 'document-viewer';
  title: string;
  source: string;
}) {
  const [generation, setGeneration] = useState(0);
  const Scenario = name === 'playground' ? Playground : StandaloneViewer;
  return (
    <DemoToolbar
      title={title}
      source={source}
      language="tsx"
      onReset={() => setGeneration((value) => value + 1)}
    >
      <Scenario key={generation} />
    </DemoToolbar>
  );
}
