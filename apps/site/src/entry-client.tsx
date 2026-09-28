/**
 * Browser entry for the docs pages: the shell behaviors (theme, search, sidebar, table of
 * contents) and, on pages that have them, the demo islands, which mount where the server left a
 * placeholder.
 */
import { initShell } from 'ppds-kit/client/shell';
import { initAnalytics } from './analytics.ts';
import 'ppds-kit/styles/site.css';

initShell();
const islands = [...document.querySelectorAll<HTMLElement>('[data-island]')];
if (islands.length > 0) {
  void import('./islands/mount.tsx').then(({ mountIslands }) => mountIslands(islands));
}
initAnalytics();
