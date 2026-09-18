/**
 * Deterministic viewer configurations for the layout and visual Playwright suites: no site
 * chrome, noindex, not in nav, sitemap or llms.txt.
 */
import type { ReactNode } from 'react';

export function HarnessPage({ assets }: { assets: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <title>Test harness · React PDF Viewer</title>
        {assets}
      </head>
      <body>
        <div id="harness" />
      </body>
    </html>
  );
}
