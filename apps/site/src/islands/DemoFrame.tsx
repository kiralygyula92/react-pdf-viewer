import '@kiralygyula92/react-pdf-viewer/styles.css';
import sdk from '@stackblitz/sdk';
import { DemoToolbar } from 'ppds-kit/react/DemoToolbar.tsx';
import {
  Component,
  lazy,
  Suspense,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import '../pdfjs';
import '../styles/demos.css';
import { stackblitzProject } from './sandbox';

const PREFIX = '../../../../content/react-pdf-viewer/';

/** One lazy component per colocated demo, created once at module level. */
const demos = Object.fromEntries(
  Object.entries(
    import.meta.glob<{ default: ComponentType }>('../../../../content/react-pdf-viewer/**/demo-*.tsx'),
  ).map(([path, load]) => [path.slice(PREFIX.length).replace(/.tsx$/, ''), lazy(load)]),
);

class DemoBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    return this.state.error ? (
      <p role="alert">This demo failed to load: {this.state.error.message}</p>
    ) : (
      this.props.children
    );
  }
}

/** Mounts a colocated demo with the PPDS demo toolbar; Reset remounts it. */
export default function DemoFrame({
  id,
  title,
  source,
}: {
  id: string;
  title: string;
  source: string;
}) {
  const [generation, setGeneration] = useState(0);
  const Demo = demos[id];
  if (!Demo) throw new Error(`Unknown demo ${id}`);

  return (
    <DemoToolbar
      title={title}
      source={source}
      language="tsx"
      onReset={() => setGeneration((value) => value + 1)}
      openSandbox={() =>
        sdk.openProject(stackblitzProject(title, source, window.location.origin), {
          newWindow: true,
          openFile: 'src/Demo.tsx',
        })
      }
    >
      <DemoBoundary key={generation}>
        <Suspense fallback={<p className="ppds-demo__loading">Loading demo…</p>}>
          <Demo />
        </Suspense>
      </DemoBoundary>
    </DemoToolbar>
  );
}
