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
        <title>{name}</title>
        <link rel="canonical" href={absoluteUrl(origin(), docs)} />
        <meta name="robots" content="noindex, follow" />
        <LegacyRedirect />
        <script dangerouslySetInnerHTML={{ __html: redirect }} />
        <noscript>
          <meta httpEquiv="refresh" content={`0; url=${docs}`} />
        </noscript>
      </head>
      <body>
        <p>
          <a href={docs}>{name} documentation</a>
        </p>
      </body>
    </html>
  );
}
