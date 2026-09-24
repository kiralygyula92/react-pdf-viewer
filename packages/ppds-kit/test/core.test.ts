import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { archetypeFor, sourceFileFor } from '../src/archetypes.ts';
import { machineSurface } from '../src/machine.ts';
import {
  codeFence,
  headingsOf,
  parseDoc,
  slugify,
  toMarkdownTwin,
  wordCount,
} from '../src/markdown.ts';
import { twinPath } from '../src/model.ts';
import { releaseChangelogPage, releaseConfig, versionLabel } from '../src/release.ts';
import { symbolSlug } from '../src/reference/render.ts';
import { llmsTxt, redirectTables, redirectsFile, sitemapXml } from '../src/surfaces.ts';
import type { PluginConfig, PluginModel } from '../src/types.ts';

describe('archetypes', () => {
  it('derives the archetype from the path', () => {
    assert.equal(archetypeFor('', false), 'A');
    assert.equal(archetypeFor('all-features/', false), 'C');
    assert.equal(archetypeFor('getting-started/installation/', false), 'F');
    assert.equal(archetypeFor('getting-started/ai-context/', false), 'F');
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

  it('maps pages to content files', () => {
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

describe('markdown', () => {
  it('splits frontmatter and finds headings outside code fences', () => {
    const { frontmatter, body } = parseDoc(
      '---\ntitle: T\n---\n## Basics\n```md\n## Not a heading\n```\n### Variant A\n',
    );
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
      'import X from \'x\';\n\n## Basics\n\n<Demo id="features/a/demo-basics" title="Basic" />\n\n<Callout type="warning">Careful</Callout>\n\nSee [API](/p/api/).\n',
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

  it('leaves code in a twin as it was written', () => {
    const markdown = toMarkdownTwin(
      'Use `<Viewer>` here.\n\n```tsx\nimport { Viewer } from \'p\';\n<Viewer source={url} />\n```\n\n<Demo id="d" />\n\n<Callout type="warning" title="Careful">\n\n```tsx\n<Viewer source={new Blob()} />\n```\n\n</Callout>\n',
      {
        demoSource: () => ({ code: 'export default () => <Viewer scale={2} />;\n', lang: 'tsx' }),
        absolute: (href) => href,
      },
    );
    assert.match(markdown, /^Use `<Viewer>` here\./);
    assert.match(
      markdown,
      /```tsx\nimport \{ Viewer \} from 'p';\n<Viewer source=\{url\} \/>\n```/,
    );
    assert.match(markdown, /```tsx\nexport default \(\) => <Viewer scale=\{2\} \/>;\n```/);
    assert.match(
      markdown,
      /> \*\*Warning: Careful\*\*\n>\n> ```tsx\n> <Viewer source=\{new Blob\(\)\} \/>\n> ```\n$/,
    );
    assert.equal(codeFence('md', 'a ``` b'), '````md\na ``` b\n````');
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
      {
        pathname: '/p/llms.txt',
        title: 'llms.txt',
        sectionTitle: 'Getting started',
        archetype: null,
      },
      { pathname: '/p/zoom/', title: 'Zoom', sectionTitle: 'Features', archetype: 'B' },
    ],
  } as unknown as PluginModel;

  it('writes llms.txt: title, description, then one list per section', () => {
    const text = llmsTxt(model, 'https://site.test', new Map([['/p/zoom/', 'Zoom in and out.']]));
    assert.match(
      text,
      /^# Plugin\n\n> Tag\.\n\nDesc\.\n\n## Getting started\n\n- \[Overview\]\(https:\/\/site\.test\/p\.md\): \n/,
    );
    assert.match(
      text,
      /## Features\n\n- \[Zoom\]\(https:\/\/site\.test\/p\/zoom\.md\): Zoom in and out\./,
    );
    assert.doesNotMatch(text, /llms\.txt\]/);
  });

  it('writes sitemaps and redirect tables', () => {
    const sitemap = sitemapXml('https://site.test', ['/b/', '/a/', '/a/']);
    assert.equal(sitemap.match(/<url>/g)?.length, 2);
    assert.ok(sitemap.indexOf('/a/</loc>') < sitemap.indexOf('/b/</loc>'));
    const { fragments, paths } = redirectTables({ '/#/docs': '/p/', '/old/': '/p/guides/x/' });
    assert.deepEqual(fragments, { '#/docs': '/p/' });
    assert.deepEqual(paths, [['/old/', '/p/guides/x/']]);
    assert.equal(redirectsFile([['/old/', '/new/']]), '/old/ /new/ 301\n');
  });
});

describe('llms-full', () => {
  const root = mkdtempSync(join(tmpdir(), 'ppds-kit-'));
  after(() => rmSync(root, { recursive: true, force: true }));
  const files: Record<string, unknown> = {
    'plugin.config.json': {
      id: 'p',
      name: 'Plugin',
      tagline: 'Tag.',
      description: 'Desc.',
      repo: 'https://code.test/p',
      currentVersion: '1.0.0',
      tiers: [],
      taxonomy: [],
      sections: [],
    },
    'nav.json': [
      {
        pathname: '/p/getting-started-group',
        children: [{ pathname: '/p/' }, { pathname: '/p/getting-started/ai-context/' }],
      },
      {
        pathname: '/p/features-group',
        children: [{ pathname: '/p/zoom/', capabilityId: 'zoom', plan: 'free' }],
      },
      { pathname: '/p/api-group', children: [{ pathname: '/p/api/' }] },
    ],
    'titles.json': {
      '/p/getting-started-group': 'Getting started',
      '/p/': 'Overview',
      '/p/getting-started/ai-context/': 'AI context',
      '/p/features-group': 'Features',
      '/p/zoom/': 'Zoom',
      '/p/api-group': 'Reference',
      '/p/api/': 'API reference',
    },
    'getting-started/overview.mdx':
      '---\ntitle: Overview\ndescription: The overview.\n---\n## Introduction\n\nHello.\n',
    'getting-started/ai-context.mdx':
      '---\ntitle: AI context\ndescription: All of it.\n---\n## Installation\n\n```bash\ncurl -o x.md %SITE_ORIGIN%/p/llms-full.md\n```\n',
    'features/zoom/index.mdx':
      '---\ntitle: Zoom\ndescription: Zoom in and out.\nsymbols: [Viewer]\n---\n## Basics\n\n<Demo id="features/zoom/demo-basic" title="Basic zoom" />\n\nAgain:\n\n<Demo id="features/zoom/demo-basic" title="Basic zoom" />\n',
    'features/zoom/demo-basic.tsx': 'export default function Demo() {\n  return <Viewer />;\n}\n',
    'features/zoom/demo-unused.tsx': 'export default function Unused() {}\n',
    'reference/viewer.schema.json': {
      name: 'Viewer',
      kind: 'component',
      imports: ["import { Viewer } from 'p';"],
      filename: 'src/Viewer.tsx',
      usedBy: ['/p/zoom/'],
      options: { scale: { type: { name: 'number' }, default: 1 } },
    },
    'reference/viewer.strings.json': {
      symbolDescription: 'The viewer.',
      optionDescriptions: { scale: 'Zoom level.' },
    },
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(
      join(root, path),
      typeof content === 'string' ? content : JSON.stringify(content),
    );
  }
  const surface = machineSurface({
    contentRoot: root,
    origin: 'https://site.test',
    package: { name: 'p-pkg', peerDependencies: { react: '>=18' } },
    notes: ['The examples load samples from the site.'],
  });
  const full = surface.get('/p/llms-full.md') ?? '';

  it('writes one file under both names, with a header describing it', () => {
    assert.equal(surface.get('/p/llms-full.txt'), full);
    assert.match(
      full,
      /^# Plugin — the complete documentation\n\n> Tag\.\n\nDesc\.\n\nEvery page of the documentation at https:\/\/site\.test\/p\/, in reading order,/,
    );
    assert.match(
      full,
      /- Package: `p-pkg`, documented at version 1\.0\.0\. Peer dependencies: `react` >=18, and nothing else\.\n- Page index: https:\/\/site\.test\/p\/llms\.txt — .*\n- 5 pages, 2 examples\.\n\nThe examples load samples from the site\.\n\n---\n/,
    );
  });

  it('holds every page in reading order, the API reference included', () => {
    const order = [
      '# Overview',
      '# AI context',
      '# Zoom',
      '# API reference',
      '# Viewer reference',
      '# Examples not shown on any page',
    ].map((heading) => full.indexOf(`\n${heading}\n`));
    assert.ok(order.every((index, i) => index > 0 && (i === 0 || index > (order[i - 1] ?? 0))));
    assert.match(
      full,
      /# Zoom\n\n> Zoom in and out\.\n\nFeatures · https:\/\/site\.test\/p\/zoom\/\n\n## Basics\n/,
    );
    assert.match(full, /## API\n\n- \[Viewer\]\(https:\/\/site\.test\/p\/api\/viewer\/\)/);
    assert.match(
      full,
      /# Viewer reference\n\n> The viewer\.\n\nReference · https:\/\/site\.test\/p\/api\/viewer\/\n\n## Used by\n/,
    );
    assert.match(full, /curl -o x\.md https:\/\/site\.test\/p\/llms-full\.md/);
    for (const content of surface.values()) assert.doesNotMatch(content, /%SITE_ORIGIN%/);
  });

  it('inlines each example once, with its code intact', () => {
    assert.match(
      full,
      /\*Example: Basic zoom\* — the source of the live demo on this page\.\n\n```tsx\nexport default function Demo\(\) \{\n {2}return <Viewer \/>;\n\}\n```\n\nAgain:\n\n\*Example: Basic zoom\* — the same source as under "Zoom"\./,
    );
    assert.match(
      full,
      /## features\/zoom\/demo-unused\n\n```tsx\nexport default function Unused\(\) \{\}\n```/,
    );
    // The page twin keeps the demo and the concatenated reference.
    const twin = surface.get('/p/zoom.md') ?? '';
    assert.match(twin, /\*\*Demo: Basic zoom\*\*\n\n```tsx\n[\s\S]*return <Viewer \/>;/);
    assert.match(twin, /\n## Viewer reference\n/);
  });

  it('mentions the full file in llms.txt ahead of the page lists', () => {
    const llms = surface.get('/p/llms.txt') ?? '';
    assert.match(
      llms,
      /\nThe whole documentation in one file, with the source of every example: \[llms-full\.md\]\(https:\/\/site\.test\/p\/llms-full\.md\)\.\n\n## Getting started\n/,
    );
    assert.match(
      llms,
      /- \[AI context\]\(https:\/\/site\.test\/p\/getting-started\/ai-context\.md\): All of it\./,
    );
    assert.doesNotMatch(llms, /^- \[[^\]]*\]\([^)]*llms-full/m);
    assert.deepEqual([...surface.keys()].sort(), [
      '/p.md',
      '/p/api.md',
      '/p/api/viewer.md',
      '/p/getting-started/ai-context.md',
      '/p/llms-full.md',
      '/p/llms-full.txt',
      '/p/llms.txt',
      '/p/zoom.md',
    ]);
  });
});

describe('release', () => {
  const page = [
    '---',
    'title: Changelog',
    "date: '2026-09-15'",
    '---',
    '',
    'Intro.',
    '',
    '## 1.0.0 (unreleased)',
    '',
    '- First.',
    '',
    '## Related',
    '',
  ].join('\n');
  const packageChangelog = [
    '# @scope/p',
    '',
    '## 1.1.0',
    '',
    '### Minor Changes',
    '',
    '- 1a2b3c4: Adds zoom presets.',
    '',
    '## 1.0.0',
    '',
    '### Major Changes',
    '',
    '- 5d6e7f8: First.',
    '',
  ].join('\n');

  it('moves the site model to the released version', () => {
    const config = {
      currentVersion: '0.1.0',
      versions: [
        { label: 'v0.1', href: '/p/', current: true },
        { label: 'v0.0', href: '/p/v0/' },
      ],
    } as unknown as PluginConfig;
    const released = releaseConfig(config, '1.0.0');
    assert.equal(released.currentVersion, '1.0.0');
    assert.deepEqual(
      released.versions?.map((entry) => entry.label),
      ['v1.0', 'v0.0'],
    );
    assert.equal(versionLabel('12.3.4'), 'v12.3');
  });

  it('dates a prepared entry, and the page', () => {
    const dated = releaseChangelogPage(page, packageChangelog, '1.0.0', '2026-10-01');
    assert.match(dated, /^## 1\.0\.0 \(2026-10-01\)$/m);
    assert.match(dated, /^date: '2026-10-01'$/m);
    assert.doesNotMatch(dated, /unreleased/);
    // Running it again changes nothing.
    assert.equal(releaseChangelogPage(dated, packageChangelog, '1.0.0', '2026-10-02'), dated);
  });

  it('adds the package changelog entry above the previous release', () => {
    const dated = releaseChangelogPage(page, packageChangelog, '1.0.0', '2026-10-01');
    const next = releaseChangelogPage(dated, packageChangelog, '1.1.0', '2026-11-01');
    assert.match(
      next,
      /Intro\.\n\n## 1\.1\.0 \(2026-11-01\)\n\n### Minor Changes\n\n- Adds zoom presets\.\n\n## 1\.0\.0 \(2026-10-01\)/,
    );
    assert.throws(() => releaseChangelogPage(page, packageChangelog, '2.0.0', '2027-01-01'));
  });
});
