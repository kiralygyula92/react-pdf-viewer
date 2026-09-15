import type { AstroIntegration } from 'astro';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDoc, toMarkdownTwin } from './markdown.ts';
import { contentPages, loadPluginModel, loadPortfolio, twinPath } from './model.ts';
import { renderOgImage } from './og.ts';
import { referenceIndexMarkdown, referenceMarkdown, loadReference } from './reference/render.ts';
import {
  absoluteUrl,
  llmsTxt,
  redirectTables,
  redirectsFile,
  rssXml,
  sitemapXml,
  type FeedItem,
} from './surfaces.ts';

export interface PpdsOptions {
  repoRoot: string;
  contentRoot: string;
  portfolio: string;
  urlMap: string;
  /** Extra `_redirects` rules, e.g. bare section paths → their first page. */
  redirects?: [from: string, to: string, status?: number][];
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function write(path: string, content: string | Uint8Array) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

const readMeta = (html: string, name: string) =>
  new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`).exec(html)?.[1];

const decode = (text: string) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

/**
 * Build-time machine surface and hosting artefacts (PPDS §7.6, §7.7, D-03): `llms.txt`, `.md`
 * twins, `sitemap.xml`, the changelog RSS feed, generated OG images, `_redirects` and the static
 * search index.
 */
export function ppds(options: PpdsOptions): AstroIntegration {
  let origin = 'http://localhost';
  return {
    name: 'ppds-kit',
    hooks: {
      'astro:config:done': ({ config }) => {
        if (config.site) origin = config.site;
      },
      'astro:build:done': async ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const model = loadPluginModel(options.contentRoot);
        const portfolio = loadPortfolio(options.portfolio);
        const { config } = model;
        const prefix = `/${config.id}/`;

        // ── Descriptions and twins ────────────────────────────────────────
        const descriptions = new Map<string, string>();
        const reference = loadReference(options.contentRoot);
        const demoSource = (id: string) => {
          for (const ext of ['tsx', 'ts', 'jsx', 'css']) {
            const path = join(options.contentRoot, `${id}.${ext}`);
            if (existsSync(path)) return { code: readFileSync(path, 'utf8'), lang: ext };
          }
          return undefined;
        };
        let twins = 0;
        for (const page of contentPages(model)) {
          if (page.pathname === `${prefix}api/`) {
            descriptions.set(
              page.pathname,
              'Generated reference for every public component, hook, function and type.',
            );
            write(
              join(dist, twinPath(page.pathname)),
              referenceIndexMarkdown(model, reference, origin),
            );
            twins++;
            continue;
          }
          if (!page.sourceFile) continue;
          const { frontmatter, body } = parseDoc(
            readFileSync(join(options.contentRoot, page.sourceFile), 'utf8'),
          );
          const description = String(frontmatter['description'] ?? '');
          descriptions.set(page.pathname, description);
          const heading = page.archetype === 'A' ? `${config.name} — Overview` : page.title;
          let markdown = `# ${heading}\n\n${description}\n\n${toMarkdownTwin(body, {
            demoSource,
            absolute: (href) => absoluteUrl(origin, href),
          })}`;
          const symbols = Array.isArray(frontmatter['symbols'])
            ? (frontmatter['symbols'] as string[])
            : [];
          if (page.archetype === 'B') {
            markdown += `\n## API\n\n${
              symbols.length
                ? symbols
                    .map(
                      (symbol) =>
                        `- [${symbol}](${absoluteUrl(origin, twinPath(`${prefix}api/${reference.slugOf(symbol)}/`))})`,
                    )
                    .join('\n')
                : 'This capability has no public symbols of its own.'
            }\n`;
            for (const symbol of symbols) {
              const entry = reference.symbols.get(symbol);
              if (entry)
                markdown += `\n---\n\n${referenceMarkdown(entry, reference, model, origin, 2)}`;
            }
          }
          write(join(dist, twinPath(page.pathname)), markdown);
          twins++;
        }
        const apiEntries = [...reference.symbols.values()].map((entry) => ({
          title: `${entry.schema.name} reference`,
          pathname: `${prefix}api/${reference.slugOf(entry.schema.name)}/`,
          description: entry.strings.symbolDescription ?? '',
          section: 'API reference',
        }));
        for (const entry of reference.symbols.values()) {
          write(
            join(dist, twinPath(`${prefix}api/${reference.slugOf(entry.schema.name)}/`)),
            referenceMarkdown(entry, reference, model, origin, 1),
          );
          twins++;
        }
        write(join(dist, config.id, 'llms.txt'), llmsTxt(model, origin, descriptions, apiEntries));
        logger.info(`llms.txt and ${twins} Markdown twins written`);

        // ── Sitemap (both surfaces) ───────────────────────────────────────
        const htmlFiles = walk(dist).filter((file) => file.endsWith('.html'));
        const pathnames = htmlFiles
          .map((file) => `/${relative(dist, file).replace(/\\/g, '/')}`.replace(/index\.html$/, ''))
          .filter((pathname) => !pathname.startsWith('/_internal/') && pathname !== '/404.html');
        write(join(dist, 'sitemap.xml'), sitemapXml(origin, pathnames));
        write(
          join(dist, 'robots.txt'),
          `User-agent: *\nDisallow: /_internal/\n\nSitemap: ${absoluteUrl(origin, '/sitemap.xml')}\n`,
        );

        // ── Changelog RSS ─────────────────────────────────────────────────
        const changelogPage = model.pages.find(
          (page) => page.pathname === `${prefix}discover-more/changelog/`,
        );
        if (changelogPage?.sourceFile) {
          const { body } = parseDoc(
            readFileSync(join(options.contentRoot, changelogPage.sourceFile), 'utf8'),
          );
          const items: FeedItem[] = [
            ...body.matchAll(/^## (.+)$([\s\S]*?)(?=^## |$(?![\s\S]))/gm),
          ].map((match) => ({
            title: `${config.name} ${match[1] ?? ''}`.trim(),
            link: `${absoluteUrl(origin, changelogPage.pathname)}#${(match[1] ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
            description: (match[2] ?? '')
              .replace(/[#*`[\]]/g, '')
              .trim()
              .slice(0, 600),
          }));
          write(
            join(dist, config.id, 'discover-more', 'changelog', 'rss.xml'),
            rssXml(
              {
                title: `${config.name} changelog`,
                link: absoluteUrl(origin, changelogPage.pathname),
                description: config.tagline,
              },
              items,
            ),
          );
        }

        // ── Redirects ─────────────────────────────────────────────────────
        const { paths } = redirectTables(readFileSync(options.urlMap, 'utf8'));
        write(join(dist, '_redirects'), redirectsFile([...paths, ...(options.redirects ?? [])]));

        // ── OG images (generated from title + description, §7.6) ─────────
        let images = 0;
        for (const file of htmlFiles) {
          const html = readFileSync(file, 'utf8');
          const image = readMeta(html, 'og:image');
          const title = readMeta(html, 'og:title');
          if (!image || !title) continue;
          const target = join(dist, new URL(image).pathname);
          if (existsSync(target)) continue;
          const section = readMeta(html, 'plugin:id') ? config.name : portfolio.name;
          write(
            target,
            await renderOgImage({
              title: decode(title),
              description: decode(readMeta(html, 'og:description') ?? ''),
              eyebrow: section,
            }),
          );
          images++;
        }
        logger.info(`${images} OG images rendered`);

        // ── Search index ──────────────────────────────────────────────────
        const pagefind = await import('pagefind');
        const { index } = await pagefind.createIndex({});
        if (index) {
          await index.addDirectory({ path: dist });
          await index.writeFiles({ outputPath: join(dist, 'pagefind') });
          logger.info('Search index written');
        }
        await pagefind.close();
      },
    },
  };
}
