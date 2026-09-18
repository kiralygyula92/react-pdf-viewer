/**
 * Redirects old hash URLs (`/#/docs?s=theming`) to their new pages in the browser, from
 * `redirects.json`. The server never sees a fragment, so this runs before first paint on the site
 * root and the 404 page.
 */
import { loadRedirects, redirectTables } from 'ppds-kit';
import { CONTENT_ROOT, PLUGIN_ID } from '../lib/site.ts';

export function LegacyRedirect() {
  const { fragments } = redirectTables(loadRedirects(CONTENT_ROOT));
  // `<` escaped, so no URL in the map can close the script element.
  const map = JSON.stringify(fragments).replace(/</g, '\\u003c');
  const script = `(function () {
  var fragments = ${map};
  var hash = window.location.hash;
  if (!hash || hash.indexOf('#/') !== 0) return;
  var target = fragments[hash];
  if (!target) {
    // Unknown old fragment: keep deep links to the viewer, else go to the docs root.
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
