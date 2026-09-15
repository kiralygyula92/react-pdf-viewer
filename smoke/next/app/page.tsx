// A Server Component: it imports the package directly (its "use client" entry becomes a client
// boundary) and renders a client wrapper that configures the worker.
import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { Viewer } from './viewer';

export default function Page() {
  return (
    <main>
      <h1>Next.js consumer smoke test</h1>
      <Viewer />
      <PdfViewer source="" aria-label="Empty viewer" />
    </main>
  );
}
