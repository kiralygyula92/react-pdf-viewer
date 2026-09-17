import Ajv2020 from 'ajv/dist/2020.js';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { GUIDE_VARIANTS, REQUIRED_BLOCKS, type BlockSpec } from './archetypes.ts';
import { parseCsv } from './csv.ts';
import { parseDoc, wordCount } from './markdown.ts';
import { contentPages, loadPluginModel, twinPath } from './model.ts';
import { loadReference } from './reference/render.ts';
import { redirectTables } from './surfaces.ts';
import type { NavNode, NavPage, PluginModel, PortfolioConfig } from './types.ts';

interface ConformanceOptions {
  contentRoot: string;
  distDir: string;
  repoRoot: string;
  report?: string | undefined;
}

interface Result {
  id: string;
  group: string;
  title: string;
  failures: string[];
  notes: string[];
  applicable: boolean;
}

const SECTION_NAMES = [
  'Getting started',
  'Features',
  'Demos',
  'Reference',
  'Customization',
  'Guides',
  'Integrations',
  'Resources',
  'Migration',
  'Discover more',
  'Design resources',
];
const BADGE_KINDS = new Set(['new', 'preview', 'beta', 'planned', 'deprecated', 'legacy', 'tier']);
const FOOTER_COLUMNS = ['Products', 'Resources', 'Explore', 'Company'];
const META_TAGS = [
  'description',
  'og:title',
  'og:description',
  'og:image',
  'og:type',
  'og:url',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
  'theme-color',
  'viewport',
  'search:language',
];
const PLUGIN_META_TAGS = ['search:version', 'plugin:id', 'plugin:categoryId'];

// ── HTML helpers (the kit controls the markup, so targeted patterns are reliable) ──
const decode = (text: string) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
const textOf = (html: string) =>
  decode(html.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
const meta = (html: string, name: string) =>
  new RegExp(`<meta (?:name|property)="${name.replace(':', '\\:')}" content="([^"]*)"`).exec(
    html,
  )?.[1];
const headingsIn = (html: string) =>
  [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => ({
    level: Number(m[1]),
    text: textOf(m[2] ?? ''),
  }));
const between = (html: string, start: RegExp, end: string) => {
  const match = start.exec(html);
  if (!match) return '';
  const from = match.index + match[0].length;
  const to = html.indexOf(end, from);
  return html.slice(from, to === -1 ? undefined : to);
};

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function htmlFor(dist: string, pathname: string): string | undefined {
  const file = pathname.endsWith('/') ? join(dist, pathname, 'index.html') : join(dist, pathname);
  return existsSync(file) ? readFileSync(file, 'utf8') : undefined;
}

function blocksFor(page: NavPage): BlockSpec[] {
  if (!page.archetype) return [];
  const blocks = [...REQUIRED_BLOCKS[page.archetype]];
  if (page.archetype === 'B') blocks.push({ level: 2, text: 'API', label: 'API' });
  if (page.archetype === 'J') {
    const variant = GUIDE_VARIANTS.find((candidate) => candidate.pattern.test(page.pathname));
    if (variant) blocks.unshift(...variant.blocks);
  }
  return blocks;
}

function navDepth(nodes: NavNode[], depth = 1): number {
  return Math.max(
    depth,
    ...nodes.map((node) => (node.children ? navDepth(node.children, depth + 1) : depth)),
  );
}

/** SHA-256 of every generated reference schema file (conformance check 10). */
function referenceChecksums(contentRoot: string): Record<string, string> {
  const dir = join(contentRoot, 'reference');
  if (!existsSync(dir)) return {};
  return Object.fromEntries(
    readdirSync(dir)
      .filter((name) => name.endsWith('.schema.json'))
      .sort()
      .map((name) => [
        name,
        createHash('sha256')
          .update(readFileSync(join(dir, name)))
          .digest('hex'),
      ]),
  );
}

/** Runs the 26 PPDS §11 checks plus the kit's extra gates and writes a Markdown report. */
export function runConformance(options: ConformanceOptions): number {
  const { contentRoot, distDir: dist, repoRoot } = options;
  const model: PluginModel = loadPluginModel(contentRoot);
  const { config } = model;
  const prefix = `/${config.id}/`;
  const results: Result[] = [];
  const check = (
    id: string,
    group: string,
    title: string,
    /** Return `false` when the check does not apply. */
    run: (fail: (m: string) => void, note: (m: string) => void) => unknown,
  ) => {
    const failures: string[] = [];
    const notes: string[] = [];
    const applicable =
      run(
        (m) => failures.push(m),
        (m) => notes.push(m),
      ) !== false;
    results.push({ id, group, title, failures, notes, applicable });
  };

  const pages = contentPages(model);
  const docs = new Map<string, { frontmatter: Record<string, unknown>; body: string }>();
  for (const page of pages) {
    if (page.sourceFile && existsSync(join(contentRoot, page.sourceFile))) {
      docs.set(page.pathname, parseDoc(readFileSync(join(contentRoot, page.sourceFile), 'utf8')));
    }
  }
  const reference = loadReference(contentRoot);
  const referencePages = [...reference.symbols.values()].map(
    (entry) => `${prefix}api/${entry.slug}/`,
  );
  const allHtml = walk(dist).filter((file) => file.endsWith('.html'));
  // Public pages: not internal fixtures, and not noindex redirect pages such as a docs-only root.
  const publicHtml = allHtml.filter(
    (file) =>
      !relative(dist, file).replace(/\\/g, '/').startsWith('_internal/') &&
      !/<meta name="robots" content="noindex/.test(readFileSync(file, 'utf8')),
  );
  const portfolioPath = join(contentRoot, '..', 'portfolio.json');
  const surfaces = (existsSync(portfolioPath)
    ? (JSON.parse(readFileSync(portfolioPath, 'utf8')) as PortfolioConfig).surfaces
    : undefined) ?? ['marketing', 'docs'];
  const docsOnly = !surfaces.includes('marketing');
  const pathOf = (file: string) =>
    `/${relative(dist, file).replace(/\\/g, '/')}`.replace(/index\.html$/, '');
  const schema = JSON.parse(
    readFileSync(join(repoRoot, 'docs/ppds/plugin-site.schema.json'), 'utf8'),
  ) as object;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  ajv.addSchema(schema, 'ppds');
  const standard = readFileSync(join(repoRoot, 'docs/ppds/02-plugin-docs-standard.md'), 'utf8');
  const vocabulary = (
    /\*\*Feature grouping\.\*\*[\s\S]*?```\n([\s\S]*?)```/.exec(standard)?.[1] ?? ''
  )
    .split(/·|\n/)
    .map((term) => term.trim())
    .filter(Boolean);

  // ── Structure ─────────────────────────────────────────────────────────────
  check(
    '1',
    'Structure',
    'Every docs page resolves to exactly one archetype and contains all its required blocks',
    (fail) => {
      const validate = ajv.getSchema('ppds#/$defs/capabilityFrontmatter');
      for (const page of pages) {
        const html = htmlFor(dist, page.pathname);
        if (!html) {
          if (page.archetype !== null) fail(`${page.pathname}: page not built`);
          continue;
        }
        const archetype = /<body[^>]*data-archetype="([A-L])"/.exec(html)?.[1];
        if (archetype !== page.archetype)
          fail(
            `${page.pathname}: renders archetype ${archetype ?? 'none'}, nav data says ${page.archetype}`,
          );
        const article = between(html, /<article class="ppds-article"[^>]*>/, '</article>');
        const h2s = headingsIn(article)
          .filter((h) => h.level === 2)
          .map((h) => h.text);
        let cursor = 0;
        for (const block of blocksFor(page)) {
          const index = h2s.findIndex(
            (text, i) =>
              i >= cursor &&
              (typeof block.text === 'string' ? text === block.text : block.text.test(text)),
          );
          if (index === -1)
            fail(
              `${page.pathname}: missing or out-of-order required block "## ${block.label.replace('{Plugin}', config.name)}" (archetype ${page.archetype})`,
            );
          else cursor = index + 1;
        }
        if (!/data-description/.test(article))
          fail(`${page.pathname}: missing one-line description`);
        if (page.archetype === 'B') {
          const data = docs.get(page.pathname)?.frontmatter ?? {};
          if (validate && !validate(data))
            fail(
              `${page.pathname}: capability frontmatter invalid: ${ajv.errorsText(validate.errors)}`,
            );
          if (data['title'] !== page.title)
            fail(
              `${page.pathname}: frontmatter title "${String(data['title'])}" ≠ titles.json "${page.title}"`,
            );
          if (data['capabilityId'] !== page.capabilityId)
            fail(`${page.pathname}: frontmatter capabilityId ≠ nav capabilityId`);
          if (data['group'] !== page.group)
            fail(
              `${page.pathname}: frontmatter group "${String(data['group'])}" ≠ nav subheader "${page.group}"`,
            );
          if ((data['plan'] ?? undefined) !== page.plan)
            fail(`${page.pathname}: frontmatter plan ≠ nav plan (N4)`);
          if ((data['lifecycle'] ?? undefined) !== page.lifecycle)
            fail(`${page.pathname}: frontmatter lifecycle ≠ nav lifecycle (N4)`);
          if (!/<ul class="ppds-chips"/.test(article))
            fail(`${page.pathname}: missing resource chip row`);
        }
        if (page.archetype === 'L') {
          if (!/data-scenario=|data-demo=/.test(article.split(/<h2\b/)[0] ?? ''))
            fail(`${page.pathname}: the live scenario must come first`);
        }
      }
      for (const path of referencePages) {
        const html = htmlFor(dist, path);
        if (!html) {
          fail(`${path}: reference page not built`);
          continue;
        }
        const h2 = headingsIn(html)
          .filter((h) => h.level === 2)
          .map((h) => h.text);
        for (const block of ['Used by', 'Import', 'Source'])
          if (!h2.includes(block)) fail(`${path}: missing ## ${block}`);
        if (
          !h2.some((text) =>
            ['Props', 'Options', 'Settings', 'Properties', 'Commands'].includes(text),
          ) &&
          !/Signature:/.test(html)
        ) {
          fail(`${path}: missing options/props table`);
        }
      }
    },
  );

  check('2', 'Structure', 'Exactly one H1 per page; heading levels never skip', (fail) => {
    for (const file of publicHtml) {
      const html = readFileSync(file, 'utf8').replace(/<dialog[\s\S]*?<\/dialog>/g, '');
      const headings = headingsIn(html);
      const h1s = headings.filter((h) => h.level === 1).length;
      if (h1s !== 1) fail(`${pathOf(file)}: ${h1s} H1 elements`);
      let previous = 0;
      for (const heading of headings) {
        if (heading.level > previous + 1 && previous !== 0)
          fail(
            `${pathOf(file)}: heading level skips from h${previous} to h${heading.level} ("${heading.text}")`,
          );
        previous = heading.level;
      }
    }
  });

  check(
    '3',
    'Structure',
    'Capability pages contain Basics (runnable demo first), Customization (customised demo), Limitations, API in that order',
    (fail) => {
      for (const page of pages.filter((p) => p.archetype === 'B')) {
        const html = htmlFor(dist, page.pathname) ?? '';
        const article = between(html, /<article class="ppds-article"[^>]*>/, '</article>');
        const h2s = headingsIn(article)
          .filter((h) => h.level === 2)
          .map((h) => h.text);
        const positions = ['Basics', 'Customization', 'Limitations', 'API'].map((name) =>
          h2s.indexOf(name),
        );
        if (
          positions.some((p) => p === -1) ||
          positions.some((p, i) => i > 0 && p < (positions[i - 1] ?? 0))
        ) {
          fail(`${page.pathname}: order is ${h2s.join(' → ')}`);
        }
        // Basics: a demo before any prose beyond one sentence (PPDS §6 B).
        const basics = /<h2[^>]*>Basics<\/h2>([\s\S]*?)(?:<h[23]\b|$)/.exec(article)?.[1] ?? '';
        const beforeDemo = basics.split(/<div class="demo-root|data-scenario=/)[0] ?? '';
        if (!/data-demo=|data-scenario=/.test(basics))
          fail(`${page.pathname}: ## Basics must contain a runnable demo`);
        else if ((textOf(beforeDemo).match(/[.!?](\s|$)/g) ?? []).length > 1)
          fail(`${page.pathname}: ## Basics has more than one sentence before its demo`);
        const customization =
          /<h2[^>]*>Customization<\/h2>([\s\S]*?)<h2\b/.exec(article)?.[1] ?? '';
        if (!/data-demo=/.test(customization))
          fail(`${page.pathname}: ## Customization must contain a demo of a customised instance`);
        if (!/href="\/[a-z0-9-]+\/customization\//.test(customization))
          fail(`${page.pathname}: ## Customization must link to the customization guide`);
      }
    },
  );

  check(
    '4',
    'Structure',
    'No capability page exceeds 8 H2s or ~2,000 words without being split',
    (fail, note) => {
      for (const page of pages.filter((p) => p.archetype === 'B' || p.archetype === 'J')) {
        const doc = docs.get(page.pathname);
        if (!doc) continue;
        const h2 = (doc.body.match(/^## /gm) ?? []).length + (page.archetype === 'B' ? 1 : 0);
        const words = wordCount(doc.body);
        if (h2 > 8) fail(`${page.pathname}: ${h2} H2s`);
        if (words > 2200) fail(`${page.pathname}: ${words} words`);
        if (words > 1800) note(`${page.pathname}: ${words} words (close to the split threshold)`);
      }
    },
  );

  check('5', 'Structure', 'Section order in the sidebar matches §5', (fail) => {
    const order = SECTION_NAMES.map((name) => name.toLowerCase().replace(/ /g, '-'));
    const ids = model.nav.map(
      (node) =>
        model.pages.find((p) => node.children && p.pathname === (node.children[0]?.pathname ?? ''))
          ?.section,
    );
    const indices = ids.map((id) => order.indexOf(id === 'reference' ? 'reference' : (id ?? '')));
    if (indices.some((index, i) => index === -1 || (i > 0 && index < (indices[i - 1] ?? 0))))
      fail(`sidebar sections out of canonical order: ${ids.join(', ')}`);
    const html = htmlFor(dist, prefix) ?? '';
    const rendered = [
      ...between(html, /<nav class="ppds-sidebar"[^>]*>/, '</nav>').matchAll(
        /<summary class="ppds-sidebar__section-title">([\s\S]*?)<\/summary>/g,
      ),
    ].map((m) => textOf(m[1] ?? ''));
    const expected = model.nav.map((node) => node.title ?? model.titles[node.pathname] ?? '');
    if (rendered.join('|') !== expected.join('|'))
      fail(
        `rendered sidebar sections [${rendered.join(', ')}] ≠ nav data [${expected.join(', ')}]`,
      );
    for (const name of rendered)
      if (!SECTION_NAMES.includes(name))
        fail(`sidebar section "${name}" is not a canonical section name`);
  });

  // ── Navigation & data ─────────────────────────────────────────────────────
  check(
    '6',
    'Navigation & data',
    'Sidebar, features index and feature matrix render from the same nav data',
    (fail, note) => {
      const capabilityPaths = model.pages.filter((p) => p.archetype === 'B').map((p) => p.pathname);
      for (const page of pages) {
        const html = htmlFor(dist, page.pathname);
        if (!html) continue;
        const sidebarLinks = [
          ...between(html, /<nav class="ppds-sidebar"[^>]*>/, '</nav>').matchAll(/href="([^"]+)"/g),
        ].map((m) => m[1]);
        const expected = pages
          .map((p) => p.pathname)
          .concat(model.pages.filter((p) => p.archetype === null).map((p) => p.pathname));
        const missing = expected.filter((path) => !sidebarLinks.includes(path));
        if (missing.length) fail(`${page.pathname}: sidebar is missing ${missing.join(', ')}`);
        break;
      }
      const index = htmlFor(dist, `${prefix}all-features/`) ?? '';
      const cards = [
        ...between(index, /<article class="ppds-article"[^>]*>/, '</article>').matchAll(
          /<h3 class="ppds-card__title"><a href="([^"]+)"/g,
        ),
      ].map((m) => m[1]);
      if (cards.join('|') !== capabilityPaths.join('|'))
        fail(
          `features index cards (${cards.length}) differ from nav capability pages (${capabilityPaths.length}) or their order`,
        );
      if (config.tiers.some((tier) => tier.id !== 'free'))
        fail('tiered plugin: feature matrix check not implemented');
      else note('Feature matrix (archetype D) not applicable: single free tier (DECISIONS D-02).');
    },
  );

  check('7', 'Navigation & data', 'Nav depth ≤ 3', (fail) => {
    const depth = navDepth(model.nav);
    if (depth > 3) fail(`nav depth is ${depth}`);
  });

  check(
    '8',
    'Navigation & data',
    'Every nav pathname resolves to a real page or is an explicit virtual group',
    (fail) => {
      const visit = (nodes: NavNode[]) => {
        for (const node of nodes) {
          if (node.children) {
            if (!node.pathname.endsWith('-group'))
              fail(`${node.pathname}: container node must be a -group`);
            visit(node.children);
          } else if (
            !(node.pathname.endsWith('/')
              ? existsSync(join(dist, node.pathname, 'index.html'))
              : existsSync(join(dist, node.pathname)))
          ) {
            fail(`${node.pathname}: not built`);
          }
        }
      };
      visit(model.nav);
    },
  );

  check(
    '9',
    'Navigation & data',
    'Every rendered badge traces back to a nav-node plan/lifecycle value',
    (fail) => {
      const expectedCount = (page: NavPage) =>
        (page.lifecycle ? 1 : 0) + (config.tiers.find((t) => t.id === page.plan)?.badge ? 1 : 0);
      for (const file of publicHtml) {
        const html = readFileSync(file, 'utf8');
        for (const match of html.matchAll(/<span class="ppds-badge[^"]*" data-badge="([^"]+)"/g)) {
          if (!BADGE_KINDS.has(match[1] ?? ''))
            fail(`${pathOf(file)}: unknown badge kind "${match[1]}"`);
        }
        const hardcoded = [...html.matchAll(/class="ppds-badge(?![^"]*" data-badge)/g)].length;
        if (hardcoded) fail(`${pathOf(file)}: ${hardcoded} badge(s) not rendered from nav data`);
        const sidebar = between(html, /<nav class="ppds-sidebar"[^>]*>/, '</nav>');
        for (const link of sidebar.matchAll(
          /<a class="ppds-sidebar__link" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,
        )) {
          const page = model.byPath.get(link[1] ?? '');
          const count = ((link[2] ?? '').match(/data-badge=/g) ?? []).length;
          if (page && count !== expectedCount(page))
            fail(
              `${pathOf(file)}: sidebar badges for ${page.pathname} (${count}) ≠ nav data (${expectedCount(page)})`,
            );
        }
      }
      for (const doc of docs.values())
        if (/ppds-badge|<Badge/.test(doc.body)) fail('a content file hardcodes a badge');
    },
  );

  // ── Reference ─────────────────────────────────────────────────────────────
  check(
    '10',
    'Reference',
    'No reference schema file has been hand-edited since the last generation (checksum)',
    (fail, note) => {
      const path = join(contentRoot, 'reference', '.checksums.json');
      if (!existsSync(path)) {
        if (reference.symbols.size) fail('reference/.checksums.json missing: run the generator');
        else fail('reference not generated yet (Phase 4)');
        return;
      }
      const recorded = JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>;
      const actual = referenceChecksums(contentRoot);
      for (const [file, hash] of Object.entries(actual))
        if (recorded[file] !== hash) fail(`${file}: checksum mismatch (hand-edited or stale)`);
      for (const file of Object.keys(recorded))
        if (!actual[file]) fail(`${file}: recorded but missing`);
      const source = spawnSync(
        process.execPath,
        [
          join(repoRoot, 'packages/ppds-kit/src/cli.ts'),
          'reference',
          contentRoot,
          resolve(repoRoot, config.referenceSource?.entry ?? ''),
          '--check',
        ],
        { cwd: repoRoot, encoding: 'utf8' },
      );
      if (source.status !== 0)
        fail(
          `reference is stale against the source: ${(source.stdout + source.stderr).trim().split('\n').slice(-3).join(' ')}`,
        );
      else note('Regeneration from the source produces identical schema files.');
    },
  );

  check(
    '11',
    'Reference',
    'Every symbols entry in capability frontmatter has a reference page',
    (fail) => {
      for (const [pathname, doc] of docs) {
        for (const symbol of (doc.frontmatter['symbols'] as string[] | undefined) ?? []) {
          if (!reference.symbols.has(symbol))
            fail(`${pathname}: symbol ${symbol} has no reference page`);
        }
      }
    },
  );

  check(
    '12',
    'Reference',
    'Every reference page’s usedBy is non-empty or explicitly marked internal',
    (fail) => {
      for (const entry of reference.symbols.values()) {
        const internal = (entry.strings as { internal?: boolean }).internal === true;
        if (!(entry.schema.usedBy ?? []).length && !internal)
          fail(`${entry.schema.name}: usedBy is empty and the symbol is not marked internal`);
      }
    },
  );

  // ── Pricing ───────────────────────────────────────────────────────────────
  const tiered = config.tiers.some((tier) => tier.id !== 'free');
  for (const [id, title] of [
    ['13', 'Every pricing-matrix row href resolves'],
    ['14', 'Every capability with a non-free plan appears in the matrix'],
    ['15', 'Every plan card has a distinct CTA verb'],
  ] as const) {
    check(id, 'Pricing', title, (fail, note) => {
      if (tiered) {
        fail('tiered plugin: pricing checks require pricing.json support');
        return;
      }
      note('Not applicable: single free tier, no pricing.json (DECISIONS D-02).');
      if (model.pages.some((page) => page.plan && page.plan !== 'free'))
        fail('a capability has a non-free plan but no pricing matrix exists');
      return false;
    });
  }

  // ── Machine surface ───────────────────────────────────────────────────────
  const llmsPath = join(dist, config.id, 'llms.txt');
  const llms = existsSync(llmsPath) ? readFileSync(llmsPath, 'utf8') : '';
  const llmsEntries = [...llms.matchAll(/^- \[([^\]]+)\]\(([^)]+)\): (.*)$/gm)].map((m) => ({
    title: m[1] ?? '',
    url: m[2] ?? '',
    description: m[3] ?? '',
  }));

  check(
    '16',
    'Machine surface',
    'llms.txt exists, lists every published docs page, and every entry resolves',
    (fail) => {
      if (!llms) {
        fail('llms.txt missing');
        return;
      }
      if (!llms.startsWith(`# ${config.name}\n`)) fail('llms.txt must start with "# {Plugin}"');
      const listed = new Set(llmsEntries.map((entry) => new URL(entry.url).pathname));
      for (const pathname of [...pages.map((p) => p.pathname), ...referencePages]) {
        if (!listed.has(twinPath(pathname))) fail(`llms.txt does not list ${pathname}`);
      }
      for (const entry of llmsEntries)
        if (!existsSync(join(dist, new URL(entry.url).pathname)))
          fail(`llms.txt entry does not resolve: ${entry.url}`);
    },
  );

  check('17', 'Machine surface', 'Every docs URL + .md returns Markdown', (fail) => {
    for (const pathname of [...pages.map((p) => p.pathname), ...referencePages]) {
      const file = join(dist, twinPath(pathname));
      if (!existsSync(file)) fail(`${twinPath(pathname)} missing`);
      else if (!readFileSync(file, 'utf8').startsWith('# '))
        fail(`${twinPath(pathname)} is not Markdown with an H1`);
    }
  });

  check('18', 'Machine surface', 'sitemap.xml covers both surfaces', (fail) => {
    const sitemapPath = join(dist, 'sitemap.xml');
    if (!existsSync(sitemapPath)) {
      fail('sitemap.xml missing');
      return;
    }
    const locs = new Set(
      [...readFileSync(sitemapPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (m) => new URL(m[1] ?? '').pathname,
      ),
    );
    for (const file of publicHtml) {
      const pathname = pathOf(file);
      if (pathname === '/404.html') continue;
      if (!locs.has(pathname)) fail(`sitemap.xml is missing ${pathname}`);
    }
    if (!docsOnly && ![...locs].some((loc) => !loc.startsWith(prefix)))
      fail('sitemap.xml has no marketing-surface URL');
    if (![...locs].some((loc) => loc.startsWith(prefix)))
      fail('sitemap.xml has no docs-surface URL');
  });

  // ── Metadata ──────────────────────────────────────────────────────────────
  check('19', 'Metadata', 'Every page emits the full §7.6 meta set', (fail, note) => {
    for (const file of publicHtml) {
      const html = readFileSync(file, 'utf8');
      const pathname = pathOf(file);
      if (pathname === '/404.html') continue;
      const pluginScoped =
        pathname.startsWith(prefix) || pathname.startsWith(`/products/${config.id}/`);
      const required = [...META_TAGS, ...(pluginScoped ? PLUGIN_META_TAGS : [])];
      for (const tag of required)
        if (meta(html, tag) === undefined) fail(`${pathname}: missing <meta ${tag}>`);
      if (!/<title>[^<]+<\/title>/.test(html)) fail(`${pathname}: missing <title>`);
      if (!/<link rel="canonical"/.test(html)) fail(`${pathname}: missing canonical`);
      if (
        meta(html, 'og:title') &&
        !(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '').includes(
          decode(meta(html, 'og:title') ?? ''),
        )
      ) {
        fail(`${pathname}: <title> and og:title derive from different strings`);
      }
      if (
        meta(html, 'description') !== meta(html, 'og:description') ||
        meta(html, 'description') !== meta(html, 'twitter:description')
      ) {
        fail(`${pathname}: description, og:description and twitter:description differ`);
      }
      const image = meta(html, 'og:image');
      if (image && !existsSync(join(dist, new URL(image).pathname)))
        fail(`${pathname}: og:image ${image} was not generated`);
    }
    note(
      'search:version, plugin:id and plugin:categoryId are required on plugin-scoped pages (docs surface and product landings); pages outside a plugin, such as a portfolio home or the 404 page, have none.',
    );
  });

  check(
    '20',
    'Metadata',
    'llms.txt description == meta description == H1 subtitle, per page',
    (fail) => {
      for (const page of pages) {
        const html = htmlFor(dist, page.pathname);
        if (!html) continue;
        const metaDescription = decode(meta(html, 'description') ?? '');
        const subtitle = textOf(
          /<p class="ppds-article__subtitle" data-description(?:="[^"]*")?>([\s\S]*?)<\/p>/.exec(
            html,
          )?.[1] ?? '',
        );
        const entry = llmsEntries.find((e) => new URL(e.url).pathname === twinPath(page.pathname));
        if (metaDescription !== subtitle) fail(`${page.pathname}: meta description ≠ H1 subtitle`);
        if (!entry || entry.description !== metaDescription)
          fail(`${page.pathname}: llms.txt description ≠ meta description`);
      }
    },
  );

  check('21', 'Metadata', 'Every page has a canonical URL with a trailing slash', (fail) => {
    for (const file of publicHtml) {
      const pathname = pathOf(file);
      if (pathname === '/404.html') continue;
      const canonical = /<link rel="canonical" href="([^"]+)"/.exec(
        readFileSync(file, 'utf8'),
      )?.[1];
      if (!canonical) fail(`${pathname}: no canonical`);
      else if (!canonical.endsWith('/') || new URL(canonical).pathname !== pathname)
        fail(`${pathname}: canonical ${canonical} is not the page URL with a trailing slash`);
    }
  });

  // ── Migration ─────────────────────────────────────────────────────────────
  check('22', 'Migration', 'Every legacy URL redirects', (fail, note) => {
    const urlMap = readFileSync(join(repoRoot, 'migration/url-map.csv'), 'utf8');
    const { fragments, paths } = redirectTables(urlMap);
    const rows = parseCsv(urlMap);
    const redirects = existsSync(join(dist, '_redirects'))
      ? readFileSync(join(dist, '_redirects'), 'utf8')
      : '';
    for (const row of rows) {
      const legacy = row['legacy_url'] ?? '';
      const target = (row['target_url'] ?? '').split('?')[0] ?? '';
      if (legacy.startsWith('/#')) {
        if (!fragments[legacy.slice(1)]) fail(`${legacy}: not in the client-side redirect map`);
      } else if (legacy.startsWith('/') && !redirects.includes(`${legacy} `)) {
        fail(`${legacy}: no _redirects rule`);
      }
      if (
        !legacy.startsWith('repo:') &&
        target &&
        !target.endsWith('.html') &&
        !htmlFor(dist, target) &&
        !existsSync(join(dist, target))
      ) {
        fail(`${legacy}: redirect target ${target} is not built`);
      }
    }
    const home = htmlFor(dist, '/') ?? '';
    const notFound = htmlFor(dist, '/404.html') ?? '';
    for (const [name, html] of [
      ['/', home],
      ['/404.html', notFound],
    ] as const) {
      if (!html.includes('window.location.replace(target)'))
        fail(`${name}: legacy fragment redirect script missing`);
    }
    note(
      `${Object.keys(fragments).length} legacy fragment URLs redirect client-side (EXCEPTIONS E-01); ${paths.length} path URLs via _redirects. Checked in a browser by the site e2e suite.`,
    );
  });

  check('23', 'Migration', 'No internal link 404s', (fail) => {
    const ids = new Map<string, Set<string>>();
    const idsOf = (file: string) => {
      let set = ids.get(file);
      if (!set) {
        set = new Set(
          [...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] ?? ''),
        );
        ids.set(file, set);
      }
      return set;
    };
    for (const file of allHtml) {
      const html = readFileSync(file, 'utf8');
      const here = pathOf(file);
      for (const match of html.matchAll(/\shref="([^"]+)"/g)) {
        const href = decode(match[1] ?? '');
        if (/^(https?:|mailto:|tel:|javascript:|data:)/.test(href) || href.startsWith('//'))
          continue;
        const url = new URL(href, `https://site.invalid${here}`);
        const target = url.pathname.endsWith('/')
          ? join(dist, url.pathname, 'index.html')
          : join(dist, url.pathname);
        const exists =
          existsSync(target) ||
          (!/\.[a-z0-9]+$/i.test(url.pathname) &&
            existsSync(join(dist, url.pathname, 'index.html')));
        if (!exists) {
          fail(`${here}: broken link ${href}`);
          continue;
        }
        if (
          url.hash.length > 1 &&
          target.endsWith('.html') &&
          !idsOf(target).has(decodeURIComponent(url.hash.slice(1)))
        ) {
          fail(`${here}: broken anchor ${href}`);
        }
      }
    }
    for (const entry of llmsEntries) {
      const body = existsSync(join(dist, new URL(entry.url).pathname))
        ? readFileSync(join(dist, new URL(entry.url).pathname), 'utf8')
        : '';
      for (const link of body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
        const url = new URL(link[1] ?? '');
        if (
          url.pathname.startsWith(prefix) &&
          !existsSync(join(dist, url.pathname)) &&
          !htmlFor(dist, url.pathname)
        ) {
          fail(`${new URL(entry.url).pathname}: broken link ${url.pathname}`);
        }
      }
    }
  });

  check('24', 'Migration', 'Old version docs still resolve', (fail, note) => {
    for (const version of config.versions ?? []) {
      if (version.href.startsWith('/') && !htmlFor(dist, version.href))
        fail(`version ${version.label}: ${version.href} not built`);
    }
    if ((config.versions ?? []).length <= 1)
      note('Only one version exists; older versions will be archived under their own URLs.');
  });

  // ── Portfolio consistency ─────────────────────────────────────────────────
  check(
    '25',
    'Portfolio consistency',
    'Same section names, badge vocabulary, footer columns and taxonomy terms',
    (fail) => {
      for (const term of config.taxonomy)
        if (!vocabulary.includes(term))
          fail(`taxonomy term "${term}" is not in the standard's vocabulary`);
      for (const section of config.sections)
        if (section.title) fail(`section ${section.id} overrides its canonical name`);
      // A docs-only site has no marketing home; its footer is checked on the docs root.
      const home = htmlFor(dist, docsOnly ? prefix : '/') ?? '';
      const columns = [
        ...between(home, /<footer class="ppds-site-footer"[^>]*>/, '</footer>').matchAll(
          /<h2[^>]*class="ppds-site-footer__heading"[^>]*>([^<]+)<\/h2>/g,
        ),
      ].map((m) => textOf(m[1] ?? ''));
      if (columns.join('|') !== FOOTER_COLUMNS.join('|'))
        fail(`footer columns [${columns.join(', ')}] ≠ [${FOOTER_COLUMNS.join(', ')}]`);
    },
  );

  check(
    '26',
    'Portfolio consistency',
    'Shared components are imported from the kit, not forked',
    (fail) => {
      const siteRoot = resolve(dist, '..');
      const shared = [
        'DocsLayout',
        'MarketingLayout',
        'Sidebar',
        'Toc',
        'Badge',
        'CardGrid',
        'DemoToolbar',
        'SiteFooter',
        'PageFooterActions',
        'ResourceChips',
        'Callout',
        'Metrics',
        'Testimonials',
        'PlanCard',
      ];
      for (const file of walk(join(siteRoot, 'src'))) {
        const name =
          file
            .replace(/\\/g, '/')
            .split('/')
            .pop()
            ?.replace(/\.(tsx?|jsx?)$/, '') ?? '';
        if (shared.includes(name))
          fail(`${relative(repoRoot, file)}: forks the shared component ${name}`);
      }
      const kit = walk(join(repoRoot, 'packages/ppds-kit/src'));
      const forbidden = [
        config.id,
        config.name,
        ...(config.referenceSource?.entry ? [dirname(dirname(config.referenceSource.entry))] : []),
      ];
      for (const file of kit) {
        const text = readFileSync(file, 'utf8');
        for (const word of forbidden)
          if (word && text.includes(word))
            fail(
              `${relative(repoRoot, file)}: plugin-specific string "${word}" in the shared kit (DECISIONS D-04)`,
            );
      }
    },
  );

  // ── Kit gates ─────────────────────────────────────────────────────────────
  check(
    'K1',
    'Kit gates',
    'Model validates (plugin-site.schema.json, nav, titles, url-map)',
    (fail, note) => {
      const run = spawnSync(
        process.execPath,
        [join(repoRoot, 'packages/ppds-kit/src/model-check.mjs'), config.id],
        { cwd: repoRoot, encoding: 'utf8' },
      );
      if (run.status !== 0)
        fail(
          (run.stdout + run.stderr)
            .split('\n')
            .filter((line) => line.startsWith('✖'))
            .slice(0, 20)
            .join('\n') || 'model check failed',
        );
      else note(run.stdout.split('\n').find((line) => line.includes('checks passed')) ?? '');
    },
  );

  check(
    'K2',
    'Kit gates',
    'Content complete: no TODO placeholders; Overview description is the plugin description (Phase 5 gate)',
    (fail) => {
      for (const [pathname, doc] of docs) {
        if (/TODO:/.test(doc.body) || /TODO:/.test(String(doc.frontmatter['description'] ?? '')))
          fail(`${pathname}: contains TODO placeholders`);
      }
      if (docs.get(prefix)?.frontmatter['description'] !== config.description)
        fail('Overview description ≠ plugin.config.json description (P10)');
    },
  );

  // ── Report ────────────────────────────────────────────────────────────────
  const failed = results.filter((r) => r.failures.length);
  const lines = [
    '# Conformance report',
    '',
    `PPDS v1.1 §11 conformance for \`${config.id}\` (${config.name} ${config.currentVersion}), generated by \`ppds-kit\` from \`${relative(repoRoot, dist).replace(/\\/g, '/')}\`.`,
    '',
    `**${results.length - failed.length} of ${results.length} checks pass.** ${failed.length ? `Failing: ${failed.map((r) => r.id).join(', ')}.` : 'All checks pass.'}`,
    '',
    '| # | Group | Check | Result |',
    '| --- | --- | --- | --- |',
    ...results.map(
      (r) =>
        `| ${r.id} | ${r.group} | ${r.title} | ${r.failures.length ? `✖ ${r.failures.length} failure${r.failures.length === 1 ? '' : 's'}` : r.applicable ? '✔ pass' : '✔ n/a'} |`,
    ),
    '',
  ];
  for (const r of results.filter((result) => result.failures.length || result.notes.length)) {
    lines.push(`## ${r.id}. ${r.title}`, '');
    for (const note of r.notes) lines.push(`- ℹ ${note}`);
    for (const failure of r.failures.slice(0, 40)) lines.push(`- ✖ ${failure}`);
    if (r.failures.length > 40) lines.push(`- … ${r.failures.length - 40} more`);
    lines.push('');
  }
  const report = `${lines.join('\n')}`;
  if (options.report) {
    const path = resolve(repoRoot, options.report);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, report.endsWith('\n') ? report : `${report}\n`);
  }
  for (const r of results)
    console.log(
      `${r.failures.length ? '✖' : '✔'} ${r.id.padEnd(3)} ${r.title}${r.failures.length ? ` (${r.failures.length})` : ''}`,
    );
  for (const r of failed)
    for (const failure of r.failures.slice(0, 8)) console.log(`    ${r.id}: ${failure}`);
  console.log(`\n${results.length - failed.length}/${results.length} checks pass`);
  return failed.length ? 1 : 0;
}
