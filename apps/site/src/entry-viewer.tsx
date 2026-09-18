/** Browser entry for the internal viewer fixture page. */
import { createRoot } from 'react-dom/client';
import ViewerFixture from './islands/ViewerFixture.tsx';

const container = document.getElementById('viewer');
if (container) createRoot(container).render(<ViewerFixture />);
