/**
 * The site root redirects to the documentation: this is a docs-only site for one product.
 * Legacy `/#/…` links are resolved first; everything else goes to the docs root.
 * A static page rather than an HTTP redirect, because the fragment of a legacy link never reaches
 * the server.
 */
import { absoluteUrl } from 'ppds-kit';
import { LegacyRedirect } from '../components/LegacyRedirect.tsx';
import { getModel, origin, PLUGIN_ID } from '../lib/site.ts';

export function RootRedirectPage() {
  const docs = `/${PLUGIN_ID}/`;
  const { name } = getModel().config;
  const redirect = `if (!window.location.hash.startsWith('#/')) window.location.replace('${docs}');`;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <title>{name}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="canonical" href={absoluteUrl(origin(), docs)} />
        <meta name="robots" content="noindex, follow" />
        <LegacyRedirect />
        <script dangerouslySetInnerHTML={{ __html: redirect }} />
        <noscript>
          <meta httpEquiv="refresh" content={`0; url=${docs}`} />
        </noscript>
        {/* Only visible for a moment, or without JavaScript until the refresh. */}
        <style>{`body{margin:0;min-height:100vh;display:grid;place-items:center;font:1rem/1.5 system-ui,sans-serif}h1{margin:0;font-size:1.25rem}a{color:#1d4ed8}`}</style>
      </head>
      <body>
        <main>
          <h1>
            <a href={docs}>{name} documentation</a>
          </h1>
        </main>
      </body>
    </html>
  );
}
