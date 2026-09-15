import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { archetypeFor, sourceFileFor } from '../src/archetypes.ts';
import { parseCsv, toCsv } from '../src/csv.ts';
import { headingsOf, parseDoc, slugify, toMarkdownTwin, wordCount } from '../src/markdown.ts';
import { twinPath } from '../src/model.ts';
import { symbolSlug } from '../src/reference/render.ts';
import { llmsTxt, redirectTables, redirectsFile, sitemapXml } from '../src/surfaces.ts';
import type { PluginModel } from '../src/types.ts';

describe('archetypes (PPDS v1.1 §6)', () => {
  it('derives the archetype from the path', () => {
    assert.equal(archetypeFor('', false), 'A');
    assert.equal(archetypeFor('all-features/', false), 'C');
    assert.equal(archetypeFor('getting-started/installation/', false), 'F');
    assert.equal(archetypeFor('getting-started/faq/', false), 'J');
    assert.equal(archetypeFor('api/', false), 'K');
    assert.equal(archetypeFor('api/some-symbol/', false), 'E');
    assert.equal(archetypeFor('demos/playground/', false), 'L');
    assert.equal(archetypeFor('guides/testing/', false), 'J');
    assert.equal(archetypeFor('migration/', false), 'K');
    assert.equal(archetypeFor('discover-more/changelog/', false), 'I');
    assert.equal(archetypeFor('conditional-logic/', true), 'B');
    assert.equal(archetypeFor('llms.txt', false), null);
    assert.throws(() => archetypeFor('mystery/', false));
  });

  it('maps pages to content files (§8.1)', () => {
    assert.equal(sourceFileFor('', false), 'getting-started/overview.mdx');
    assert.equal(sourceFileFor('conditional-logic/', true), 'features/conditional-logic/index.mdx');
    assert.equal(sourceFileFor('all-features/', false), 'features/index.mdx');
    assert.equal(sourceFileFor('customization/', false), 'customization/index.mdx');
    assert.equal(sourceFileFor('customization/theming/', false), 'customization/theming.mdx');
    assert.equal(sourceFileFor('demos/playground/', false), 'demos/playground/index.mdx');
    assert.equal(sourceFileFor('api/', false), null);
    assert.equal(sourceFileFor('llms.txt', false), null);
  });
});

describe('csv', () => {
  it('round-trips quoted fields', () => {
    const csv = toCsv([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ]);
    assert.deepEqual(parseCsv(csv), [{ a: 'x, y', b: 'say "hi"' }]);
  });
});

describe('markdown', () => {
  it('splits frontmatter and finds headings outside code fences', () => {
    const { frontmatter, body } = parseDoc('---\ntitle: T\n---\n## Basics\n```md\n## Not a heading\n```\n### Variant A\n');
    assert.equal(frontmatter['title'], 'T');
    assert.deepEqual(
      headingsOf(body).map((h) => [h.depth, h.text, h.slug]),
      [
        [2, 'Basics', 'basics'],
        [3, 'Variant A', 'variant-a'],
      ],
    );
    assert.equal(slugify('Why `Acme` & friends?'), 'why-acme--friends');
    assert.equal(wordCount('Hello world\n```ts\nconst ignored = 1;\n```'), 2);
  });

  it('converts MDX to a Markdown twin', () => {
    const markdown = toMarkdownTwin(
      "import X from 'x';\n\n## Basics\n\n<Demo id=\"features/a/demo-basics\" title=\"Basic\" />\n\n<Callout type=\"warning\">Careful</Callout>\n\nSee [API](/p/api/).\n",
      {
        demoSource: () => ({ code: 'export default 1;', lang: 'tsx' }),
        absolute: (href) => `https://site.test${href}`,
      },
    );
    assert.match(markdown, /\*\*Demo: Basic\*\*\n\n```tsx\nexport default 1;\n```/);
    assert.match(markdown, /> \*\*Warning:\*\* Careful/);
    assert.match(markdown, /\(https:\/\/site\.test\/p\/api\/\)/);
    assert.doesNotMatch(markdown, /import X/);
  });

  it('names twins and reference slugs', () => {
    assert.equal(twinPath('/p/zoom/'), '/p/zoom.md');
    assert.equal(twinPath('/p/'), '/p.md');
    assert.equal(symbolSlug('ConditionalRule'), 'conditional-rule');
    assert.equal(symbolSlug('useHTTPClient'), 'use-http-client');
    assert.equal(symbolSlug('CSS variables'), 'css-variables');
  });
});

describe('machine surface', () => {
  const model = {
    config: { id: 'p', name: 'Plugin', tagline: 'Tag.', description: 'Desc.' },
    pages: [
      { pathname: '/p/', title: 'Overview', sectionTitle: 'Getting started', archetype: 'A' },
      { pathname: '/p/llms.txt', title: 'llms.txt', sectionTitle: 'Getting started', archetype: null },
      { pathname: '/p/zoom/', title: 'Zoom', sectionTitle: 'Features', archetype: 'B' },
    ],
  } as unknown as PluginModel;

  it('writes llms.txt in the §7.7 format', () => {
    const text = llmsTxt(model, 'https://site.test', new Map([['/p/zoom/', 'Zoom in and out.']]));
    assert.match(text, /^# Plugin\n\n> Tag\.\n\nDesc\.\n\n## Getting started\n\n- \[Overview\]\(https:\/\/site\.test\/p\.md\): \n/);
    assert.match(text, /## Features\n\n- \[Zoom\]\(https:\/\/site\.test\/p\/zoom\.md\): Zoom in and out\./);
    assert.doesNotMatch(text, /llms\.txt\]/);
  });

  it('writes sitemaps and redirect tables', () => {
    const sitemap = sitemapXml('https://site.test', ['/b/', '/a/', '/a/']);
    assert.equal(sitemap.match(/<url>/g)?.length, 2);
    assert.ok(sitemap.indexOf('/a/</loc>') < sitemap.indexOf('/b/</loc>'));
    const { fragments, paths } = redirectTables(
      'legacy_url,content_type_found,target_archetype,target_url,action,redirect,notes\n/#/docs,reference,A,/p/,split,client-side,\n/old/,how-to,J,/p/guides/x/,port,301,\n',
    );
    assert.deepEqual(fragments, { '#/docs': '/p/' });
    assert.deepEqual(paths, [['/old/', '/p/guides/x/']]);
    assert.equal(redirectsFile([['/old/', '/new/']]), '/old/ /new/ 301\n');
  });
});
