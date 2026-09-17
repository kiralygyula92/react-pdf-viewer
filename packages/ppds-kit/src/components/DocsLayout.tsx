/**
 * Docs surface shell (PPDS §2.2): announcement → docs header → sidebar · content · right rail →
 * page footer actions → global footer.
 */
import type { ReactNode } from 'react';
import { neighbours } from '../model.ts';
import type { PageMeta } from '../surfaces.ts';
import type { NavNode, NavPage, PluginModel, PortfolioConfig } from '../types.ts';
import { DocsHeader } from './DocsHeader.tsx';
import { Head } from './Head.tsx';
import { PageFooterActions } from './PageFooterActions.tsx';
import { Sidebar } from './Sidebar.tsx';
import { SiteFooter } from './SiteFooter.tsx';
import { Toc, type Heading } from './Toc.tsx';

export interface DocsLayoutProps {
  model: PluginModel;
  portfolio: PortfolioConfig;
  page: NavPage;
  meta: PageMeta;
  headings: Heading[];
  descriptions: Map<string, string>;
  sourcePath?: string | undefined;
  generatedFrom?: string | undefined;
  twin?: string | undefined;
  feeds?: { title: string; href: string }[];
  announcement?: { text: string; href: string } | undefined;
  /** Generated sidebar nodes, keyed by section group pathname (N3). */
  injectedNav?: Record<string, NavNode[]> | undefined;
  /** Stylesheet and script tags for the page, supplied by the renderer. */
  assets?: ReactNode;
  children?: ReactNode;
}

export function DocsLayout({
  model,
  portfolio,
  page,
  meta,
  headings,
  descriptions,
  sourcePath,
  generatedFrom,
  twin,
  feeds,
  announcement,
  injectedNav,
  assets,
  children,
}: DocsLayoutProps) {
  const { previous, next } = neighbours(model, page.pathname);
  return (
    <html lang={meta.language}>
      <head>
        <Head meta={meta} siteName={model.config.name} twin={twin} feed={feeds?.[0]} />
        {assets}
      </head>
      <body className="ppds ppds--docs" data-archetype={page.archetype}>
        <a className="ppds-skip-link" href="#main">
          Skip to content
        </a>
        {announcement && (
          <div className="ppds-announcement" role="region" aria-label="Announcement">
            <a href={announcement.href}>{announcement.text}</a>
          </div>
        )}
        <DocsHeader config={model.config} />
        <div className="ppds-docs">
          <details className="ppds-docs__sidebar" id="ppds-sidebar-panel" data-sidebar open>
            <summary className="ppds-docs__sidebar-summary">Browse documentation</summary>
            <Sidebar
              model={model}
              current={page.pathname}
              descriptions={descriptions}
              injected={injectedNav}
            />
          </details>
          <main
            id="main"
            className="ppds-docs__main"
            tabIndex={-1}
            data-pagefind-body
            data-pagefind-filter-plugin={model.config.id}
          >
            <span hidden data-pagefind-filter={`version:${model.config.currentVersion}`} />
            <span hidden data-pagefind-filter={`plugin:${model.config.id}`} />
            <nav className="ppds-breadcrumbs" aria-label="Breadcrumb" data-pagefind-ignore>
              <ol>
                <li>
                  <a href={`/${model.config.id}/`}>{model.config.name}</a>
                </li>
                <li>{page.sectionTitle}</li>
                {page.group && <li>{page.group}</li>}
              </ol>
            </nav>
            <article className="ppds-article">{children}</article>
            <PageFooterActions
              repo={model.config.repo}
              sourcePath={sourcePath}
              generatedFrom={generatedFrom}
              title={page.title}
              url={meta.canonical}
              previous={previous}
              next={next}
            />
          </main>
          <aside className="ppds-docs__rail" aria-label="On this page">
            <Toc headings={headings} />
          </aside>
        </div>
        <SiteFooter portfolio={portfolio} feeds={feeds ?? []} />
      </body>
    </html>
  );
}
