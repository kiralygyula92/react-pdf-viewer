import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@kiralygyula92/react-pdf-viewer/styles.css';
import './pdfjs';
import './styles.css';
import { App } from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
