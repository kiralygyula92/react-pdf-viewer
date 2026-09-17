/**
 * Archetype template (PPDS v1.1 §6). Emits the blocks that are layout or generated from data
 * (H1, one-line description, badges, resource chips, card grids, `## API` links); the authored
 * body is `children`.
 */
import type { ReactNode } from 'react';
import { slugify } from '../markdown.ts';
import type { NavPage, PluginModel } from '../types.ts';
import { Badge } from './Badge.tsx';
import { CardGrid, type CardGridItem } from './CardGrid.tsx';
import { ResourceChips } from './ResourceChips.tsx';

export interface GeneratedBlocks {
  /** Archetype B: public symbols documented by the page, with their reference URLs. */
  api?: { symbol: string; href: string; description?: string | undefined }[];
  /** Archetype C: capability groups in sidebar order. */
  groups?: { title: string; items: NavPage[] }[];
  /** Archetype K: the section's pages. */
  cards?: CardGridItem[];
}

export interface DocsArticleProps {
  model: PluginModel;
  page: NavPage;
  title?: string | undefined;
  description: string;
  links?: Record<string, string> | undefined;
  /** Archetype I: publication or last-updated date (ISO). */
  date?: string | undefined;
  descriptions: Map<string, string>;
  generated?: GeneratedBlocks;
  children?: ReactNode;
}

export function DocsArticle({
  model,
  page,
  title,
  description,
  links,
  date,
  descriptions,
  generated = {},
  children,
}: DocsArticleProps) {
  const heading =
    title ?? (page.archetype === 'A' ? `${model.config.name} — Overview` : page.title);
  return (
    <>
      <header className="ppds-article__header">
        <h1 className="ppds-article__title">
          {heading}
          <Badge page={page} tiers={model.config.tiers} />
        </h1>
        <p className="ppds-article__subtitle" data-description>
          {description}
        </p>
        {page.archetype === 'I' && date && (
          <p className="ppds-article__meta">
            Updated{' '}
            <time dateTime={date}>
              {new Date(date).toLocaleDateString('en', { dateStyle: 'long' })}
            </time>
          </p>
        )}
        {page.archetype === 'B' && links && (
          <ResourceChips links={links} repo={model.config.repo} />
        )}
      </header>

      <div className="ppds-prose">
        {children}

        {page.archetype === 'C' &&
          (generated.groups ?? []).map((group) => (
            <section className="ppds-group" key={group.title}>
              <h2 id={slugify(group.title)}>{group.title}</h2>
              <CardGrid
                tiers={model.config.tiers}
                items={group.items.map((item) => ({
                  title: item.title,
                  description: descriptions.get(item.pathname),
                  href: item.pathname,
                  page: item,
                }))}
              />
            </section>
          ))}

        {page.archetype === 'K' && generated.cards && (
          <section>
            <h2 id="in-this-section">In this section</h2>
            {generated.cards.length > 0 ? (
              <CardGrid items={generated.cards} tiers={model.config.tiers} />
            ) : (
              <p>There are no pages in this section yet.</p>
            )}
          </section>
        )}

        {page.archetype === 'B' && (
          <section className="ppds-api" aria-labelledby="api">
            <h2 id="api">API</h2>
            {generated.api && generated.api.length > 0 ? (
              <ul>
                {generated.api.map((entry) => (
                  <li key={entry.symbol}>
                    <a href={entry.href}>
                      <code>{entry.symbol}</code>
                    </a>
                    {entry.description && <span> — {entry.description}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>This capability has no public symbols of its own.</p>
            )}
          </section>
        )}
      </div>
    </>
  );
}
