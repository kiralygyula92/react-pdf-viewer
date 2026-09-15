import '@kiralygyula92/react-pdf-viewer/styles.css';
import '../pdfjs';
import '../styles/demos.css';
import { StandaloneViewer } from './StandaloneViewer';

/** Entry for `/_internal/viewer/`: the URL-driven viewer with its stylesheets and PDF.js setup. */
export default function ViewerFixture() {
  return <StandaloneViewer />;
}
