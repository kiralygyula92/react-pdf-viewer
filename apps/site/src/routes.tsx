/**
 * Every URL the site publishes, with the component that renders it and the client bundle it needs.
 * Pages come from nav data and the generated reference, never from a file-name convention.
 */
import type { ReactElement, ReactNode } from 'react';
import { loadReference } from 'ppds-kit';
import { ApiIndexPage } from './pages/ApiIndexPage.tsx';
import { ApiSymbolPage } from './pages/ApiSymbolPage.tsx';
import { DocsPage } from './pages/DocsPage.tsx';
import { HarnessPage } from './pages/HarnessPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { RootRedirectPage } from './pages/RootRedirectPage.tsx';
import { ViewerFixturePage } from './pages/ViewerFixturePage.tsx';
import { CONTENT_ROOT, getModel, PLUGIN_ID } from './lib/site.ts';

/** Client bundles (see vite.config.ts). Pages without one ship no JavaScript. */
export type EntryName = 'site' | 'harness' | 'viewer';

export interface Route {
  /** URL as it is served, with a trailing slash. */
  pathname: string;
  /** File written under the output directory. */
  file: string;
  entry?: EntryName;
  render: (assets: ReactNode) => ReactElement;
}

const htmlFile = (pathname: string) =>
  pathname.endsWith('.html') ? pathname.slice(1) : `${pathname.slice(1)}index.html`;

export function getRoutes(): Route[] {
  const model = getModel();
  const reference = loadReference(CONTENT_ROOT);
  const routes: Route[] = [
    {
      pathname: '/',
      file: 'index.html',
      render: () => <RootRedirectPage />,
    },
    {
      pathname: '/404.html',
      file: '404.html',
      entry: 'site',
      render: (assets) => <NotFoundPage assets={assets} />,
    },
    {
      pathname: '/_internal/harness/',
      file: '_internal/harness/index.html',
      entry: 'harness',
      render: (assets) => <HarnessPage assets={assets} />,
    },
    {
      pathname: '/_internal/viewer/',
      file: '_internal/viewer/index.html',
      entry: 'viewer',
      render: (assets) => <ViewerFixturePage assets={assets} />,
    },
    {
      pathname: `/${PLUGIN_ID}/api/`,
      file: htmlFile(`/${PLUGIN_ID}/api/`),
      entry: 'site',
      render: (assets) => <ApiIndexPage assets={assets} />,
    },
  ];

  for (const page of model.pages) {
    if (!page.sourceFile) continue;
    routes.push({
      pathname: page.pathname,
      file: htmlFile(page.pathname),
      entry: 'site',
      render: (assets) => <DocsPage pathname={page.pathname} assets={assets} />,
    });
  }

  for (const entry of reference.symbols.values()) {
    const pathname = `/${PLUGIN_ID}/api/${entry.slug}/`;
    routes.push({
      pathname,
      file: htmlFile(pathname),
      entry: 'site',
      render: (assets) => <ApiSymbolPage name={entry.schema.name} assets={assets} />,
    });
  }

  return routes;
}
