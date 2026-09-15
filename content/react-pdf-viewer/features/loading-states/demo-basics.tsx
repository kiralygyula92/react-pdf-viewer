import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

// A request that never finishes, so the loading view stays visible.
const neverResolves = () => new Promise<Response>(() => undefined);

export default function Demo() {
  return <PdfViewer source="/samples/letter-3pages.pdf" fetcher={neverResolves} />;
}
