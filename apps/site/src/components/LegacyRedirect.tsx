/**
 * Redirects legacy hash URLs (`/#/docs?s=theming`) to their new pages in the browser, from the
 * map generated from migration/url-map.csv (EXCEPTIONS E-01). Runs before first paint.
 */
import { readFileSync } from 'node:fs';
import { redirectTables } from 'ppds-kit';
import { PLUGIN_ID, REPO_ROOT } from '../lib/site.ts';

export function LegacyRedirect() {
  const { fragments } = redirectTables(readFileSync(`${REPO_ROOT}migration/url-map.csv`, 'utf8'));
  const script = `(function () {
  var fragments = ${JSON.stringify(fragments)};
  var hash = window.location.hash;
  if (!hash || hash.indexOf('#/') !== 0) return;
  var target = fragments[hash];
  if (!target) {
    // Unknown legacy fragment: keep deep links to the viewer, else go to the docs root.
    var route = hash.slice(1).split('?')[0];
    var query = hash.indexOf('?') === -1 ? '' : hash.slice(hash.indexOf('?'));
    if (route === '/view') target = '/${PLUGIN_ID}/demos/playground/' + query;
    else if (route === '/harness') target = '/_internal/harness/' + query;
    else target = '/${PLUGIN_ID}/';
  }
  window.location.replace(target);
})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
