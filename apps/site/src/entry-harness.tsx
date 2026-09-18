/** Browser entry for the internal test harness page. */
import '@kiralygyula92/react-pdf-viewer/styles.css';
import { createRoot } from 'react-dom/client';
import { Harness } from './islands/Harness.tsx';
import './pdfjs.ts';
import './styles/harness.css';

const container = document.getElementById('harness');
if (container) createRoot(container).render(<Harness />);
