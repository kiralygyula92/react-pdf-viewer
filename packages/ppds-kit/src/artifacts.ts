import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { LLMS_FULL_FILES, machineSurface, type MachineSurfaceOptions } from './machine.ts';
import { parseDoc, slugify } from './markdown.ts';
import { loadPluginModel, loadPortfolio, loadRedirects } from './model.ts';
import { renderOgImage } from './og.ts';
import {
  absoluteUrl,
  redirectTables,
  redirectsFile,
  rssXml,
  sitemapXml,
  type FeedItem,
} from './surfaces.ts';

export interface SiteArtifactOptions {
  /** Directory of the built site. */
  dist: string;
  /** Canonical origin for the absolute URLs in metadata, feeds and the machine surface. */
  origin: string;
  contentRoot: string;
  portfolio: string;
  /** The documented package, named in the header of `llms-full.md`. */
  package?: MachineSurfaceOptions['package'];
  /** Paragraphs for the header of `llms-full.md`. */
  notes?: MachineSurfaceOptions['notes'];
  /** Progress reporter; silent by default. */
  log?: (message: string) => void;
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
 * Build-time machine surface and hosting artefacts: `llms.txt`, `.md` twins, `llms-full.md`,
 * `sitemap.xml`, the changelog RSS feed, generated OG images, `_redirects` and the static search
 * index.
 */
export async function buildSiteArtifacts(options: SiteArtifactOptions): Promise<void> {
  const { dist, origin } = options;
  const logger = { info: options.log ?? (() => {}) };
  const model = loadPluginModel(options.contentRoot);
  const portfolio = loadPortfolio(options.portfolio);
  const { config } = model;
  const prefix = `/${config.id}/`;

  // ── Twins, llms.txt and llms-full ────────────────────────────────
  const machine = machineSurface({
    contentRoot: options.contentRoot,
    origin,
    package: options.package,
    notes: options.notes,
  });
  for (const [pathname, content] of machine) write(join(dist, pathname), content);
  logger.info(
    `llms.txt, ${LLMS_FULL_FILES.join(', ')} and ${machine.size - 1 - LLMS_FULL_FILES.length} Markdown twins written`,
  );

  // ── Sitemap (both surfaces) ───────────────────────────────────────
  // Noindex pages (redirect pages such as a docs-only root) stay out of the sitemap.
  const htmlFiles = walk(dist).filter(
    (file) =>
      file.endsWith('.html') &&
      !/<meta name="robots" content="noindex/.test(readFileSync(file, 'utf8')),
  );
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
    // One item per release heading (`## 1.2.0 …`); other sections such as Related are skipped.
    const items: FeedItem[] = [...body.matchAll(/^## (.+)$([\s\S]*?)(?=^## |$(?![\s\S]))/gm)]
      .filter((match) => /^v?\d/.test(match[1] ?? ''))
      .map((match) => ({
        title: `${config.name} ${match[1] ?? ''}`.trim(),
        link: `${absoluteUrl(origin, changelogPage.pathname)}#${slugify(match[1] ?? '')}`,
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
  const { paths } = redirectTables(loadRedirects(options.contentRoot));
  write(join(dist, '_redirects'), redirectsFile(paths));

  // ── OG images (generated from title + description) ────────────────
  const faviconPath = join(dist, 'favicon.svg');
  const logo = existsSync(faviconPath) ? readFileSync(faviconPath, 'utf8') : undefined;
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
        logo,
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
}
