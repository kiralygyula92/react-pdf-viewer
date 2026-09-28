/** Generated API index (archetype K): cards come from the generated reference, never by hand. */
import type { ReactNode } from 'react';
import { loadReference, slugify, symbolsByKind, symbolSummary, type NavPage } from 'ppds-kit';
import { CardGrid, DocsArticle, DocsLayout, type CardGridItem } from 'ppds-kit/components';
import {
  CONTENT_ROOT,
  feeds,
  getDescriptions,
  getModel,
  getPortfolio,
  injectedNav,
  pageMeta,
  PLUGIN_ID,
  twin,
} from '../lib/site.ts';

export function ApiIndexPage({ assets }: { assets: ReactNode }) {
  const model = getModel();
  const page = model.byPath.get(`/${PLUGIN_ID}/api/`) as NavPage;
  const descriptions = getDescriptions();
  const reference = loadReference(CONTENT_ROOT);
  const description = descriptions.get(page.pathname) ?? '';

  const groups = new Map<string, CardGridItem[]>(
    symbolsByKind(reference).map(([label, entries]) => [
      label,
      entries.map((entry) => ({
        title: entry.schema.name,
        description: symbolSummary(entry),
        href: `/${PLUGIN_ID}/api/${entry.slug}/`,
      })),
    ]),
  );
  const headings = [...groups.keys()].map((text) => ({ depth: 2, slug: slugify(text), text }));

  return (
    <DocsLayout
      model={model}
      portfolio={getPortfolio()}
      page={page}
      meta={pageMeta(page, page.title, description)}
      headings={headings}
      descriptions={descriptions}
      generatedFrom={`${model.config.referenceSource?.entry ?? ''}`}
      twin={twin(page.pathname)}
      feeds={feeds}
      injectedNav={injectedNav()}
      assets={assets}
    >
      <DocsArticle model={model} page={page} description={description} descriptions={descriptions}>
        <p>
          Every page in this section is generated from the TypeScript declarations and TSDoc
          comments of <code>@kiralygyula92/react-pdf-viewer</code>, so it always matches the
          published types. Capability pages explain when to use each symbol; these pages list
          everything it accepts.
        </p>
        {[...groups].map(([title, items]) => (
          <section key={title}>
            <h2 id={slugify(title)}>{title}</h2>
            <CardGrid items={items} />
          </section>
        ))}
      </DocsArticle>
    </DocsLayout>
  );
}
