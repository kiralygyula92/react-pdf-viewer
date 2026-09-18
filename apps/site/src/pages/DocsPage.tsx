/**
 * Every authored docs page in nav.json. The archetype template, sidebar, ToC, badges,
 * metadata and footer actions all come from ppds-kit; this page only joins nav data to content.
 */
import type { ReactNode } from 'react';
import { loadReference, slugify, type NavPage } from 'ppds-kit';
import {
  Callout,
  CardGrid,
  DocsArticle,
  DocsLayout,
  ScrollTable,
  type GeneratedBlocks,
  type Heading,
} from 'ppds-kit/components';
import { getDoc } from '../content.ts';
import { Demo } from '../components/Demo.tsx';
import { ReferenceTable } from '../components/ReferenceTable.tsx';
import { Scenario } from '../components/Scenario.tsx';
import {
  CONTENT_PATH,
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

const MDX_COMPONENTS = { Demo, Callout, Scenario, CardGrid, ReferenceTable, table: ScrollTable };

export function DocsPage({ pathname, assets }: { pathname: string; assets: ReactNode }) {
  const model = getModel();
  const page = model.byPath.get(pathname) as NavPage;
  const { default: Content, frontmatter, headings } = getDoc(page.sourceFile ?? '');
  const descriptions = getDescriptions();
  const reference = loadReference(CONTENT_ROOT);
  const { description, links, date, symbols = [] } = frontmatter;

  const generated: GeneratedBlocks = {};
  const extraHeadings: Heading[] = [];

  if (page.archetype === 'B') {
    generated.api = symbols.map((symbol) => ({
      symbol,
      href: `/${PLUGIN_ID}/api/${reference.slugOf(symbol)}/`,
      description: reference.symbols
        .get(symbol)
        ?.strings.symbolDescription?.replace(/<[^>]+>/g, ''),
    }));
    extraHeadings.push({ depth: 2, slug: 'api', text: 'API' });
  }
  if (page.archetype === 'C') {
    generated.groups = model.config.taxonomy.map((title) => ({
      title,
      items: model.pages.filter(
        (candidate) => candidate.archetype === 'B' && candidate.group === title,
      ),
    }));
    extraHeadings.push(
      ...generated.groups.map((group) => ({
        depth: 2,
        slug: slugify(group.title),
        text: group.title,
      })),
    );
  }
  if (page.archetype === 'K') {
    generated.cards = model.pages
      .filter(
        (candidate) => candidate.section === page.section && candidate.pathname !== page.pathname,
      )
      .map((candidate) => ({
        title: candidate.title,
        description: descriptions.get(candidate.pathname),
        href: candidate.pathname,
        page: candidate,
      }));
  }

  const meta = pageMeta(
    page,
    page.archetype === 'A' ? `${model.config.name} — Overview` : page.title,
    description,
  );

  return (
    <DocsLayout
      model={model}
      portfolio={getPortfolio()}
      page={page}
      meta={meta}
      headings={[...headings, ...extraHeadings]}
      descriptions={descriptions}
      sourcePath={`${CONTENT_PATH}/${page.sourceFile}`}
      twin={twin(page.pathname)}
      feeds={feeds}
      injectedNav={injectedNav()}
      assets={assets}
    >
      <DocsArticle
        model={model}
        page={page}
        description={description}
        links={links}
        date={date}
        descriptions={descriptions}
        generated={generated}
      >
        <Content components={MDX_COMPONENTS} />
      </DocsArticle>
    </DocsLayout>
  );
}
