/**
 * URL-driven full-page viewer (`?src=&page=&zoom=&rotation=`) for the functional Playwright suites
 * (EXCEPTIONS E-03): no site chrome, noindex, not in nav, sitemap or llms.txt. The public demo is
 * the Playground (DECISIONS D-07).
 */
import type { ReactNode } from 'react';

export function ViewerFixturePage({ assets }: { assets: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <title>Viewer fixture · React PDF Viewer</title>
        {assets}
      </head>
      <body>
        <div className="demo-root" id="viewer" />
      </body>
    </html>
  );
}
