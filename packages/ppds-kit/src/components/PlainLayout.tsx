/**
 * A page outside the docs content with the same minimal docs header and footer (e.g. the 404 page),
 * for docs-only sites without a marketing surface.
 */
import type { ReactNode } from 'react';
import type { PageMeta } from '../surfaces.ts';
import type { PluginConfig, PortfolioConfig } from '../types.ts';
import { DocsHeader } from './DocsHeader.tsx';
import { Head } from './Head.tsx';
import { SiteFooter } from './SiteFooter.tsx';

export interface PlainLayoutProps {
  meta: PageMeta;
  config: PluginConfig;
  portfolio: PortfolioConfig;
  feeds?: { title: string; href: string }[];
  /** Extra tags for the document head (e.g. a redirect script). */
  headExtra?: ReactNode;
  /** Stylesheet and script tags for the page, supplied by the renderer. */
  assets?: ReactNode;
  children?: ReactNode;
}

export function PlainLayout({
  meta,
  config,
  portfolio,
  feeds,
  headExtra,
  assets,
  children,
}: PlainLayoutProps) {
  return (
    <html lang={meta.language}>
      <head>
        <Head meta={meta} siteName={config.name} />
        {assets}
        {headExtra}
      </head>
      <body className="ppds ppds--marketing">
        <a className="ppds-skip-link" href="#main">
          Skip to content
        </a>
        <DocsHeader config={config} />
        <main id="main" className="ppds-marketing" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter portfolio={portfolio} feeds={feeds ?? []} />
      </body>
    </html>
  );
}
