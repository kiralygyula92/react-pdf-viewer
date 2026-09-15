import { parseCsv } from './csv.ts';
import { contentPages, twinPath } from './model.ts';
import type { NavPage, PluginModel } from './types.ts';

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  ogType: 'website' | 'article';
  language: string;
  version?: string;
  pluginId?: string;
  categoryId?: string | null;
}

const escapeXml = (text: string) =>
  text.replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c,
  );

/** Absolute URL on the site origin. */
export function absoluteUrl(origin: string, pathname: string): string {
  return new URL(pathname, origin.endsWith('/') ? origin : `${origin}/`).toString();
}

/** OG image path for a page: `/og/{pathname}index.png` (generated at build, §7.6). */
export function ogImagePath(pathname: string): string {
  const clean = pathname.replace(/^\//, '').replace(/\/$/, '');
  return `/og/${clean === '' ? 'index' : clean}.png`;
}

/**
 * `llms.txt` for one plugin (PPDS §7.7): `# {Plugin}`, a two-line description, then one group
 * per section listing every page's `.md` twin with its one-line description.
 */
export function llmsTxt(
  model: PluginModel,
  origin: string,
  descriptions: Map<string, string>,
  extra: { title: string; pathname: string; description: string; section: string }[] = [],
): string {
  const { config } = model;
  const lines = [`# ${config.name}`, '', `> ${config.tagline}`, '', config.description, ''];
  const sections = new Map<string, { title: string; pathname: string; description: string }[]>();
  const add = (
    section: string,
    entry: { title: string; pathname: string; description: string },
  ) => {
    const list = sections.get(section) ?? [];
    list.push(entry);
    sections.set(section, list);
  };
  for (const page of contentPages(model)) {
    add(page.sectionTitle, {
      title: page.title,
      pathname: page.pathname,
      description: descriptions.get(page.pathname) ?? '',
    });
  }
  for (const entry of extra) add(entry.section, entry);
  for (const [section, entries] of sections) {
    lines.push(`## ${section}`, '');
    for (const entry of entries) {
      lines.push(
        `- [${entry.title}](${absoluteUrl(origin, twinPath(entry.pathname))}): ${entry.description}`,
      );
    }
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

/** `sitemap.xml` covering both surfaces (PPDS §7.7, check 18). */
export function sitemapXml(origin: string, pathnames: string[]): string {
  const urls = [...new Set(pathnames)]
    .sort()
    .map((pathname) => `  <url><loc>${escapeXml(absoluteUrl(origin, pathname))}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  date?: string;
}

/** RSS 2.0 feed (changelog, blog). */
export function rssXml(
  channel: { title: string; link: string; description: string },
  items: FeedItem[],
): string {
  const body = items
    .map(
      (item) =>
        `    <item>\n      <title>${escapeXml(item.title)}</title>\n      <link>${escapeXml(item.link)}</link>\n      <guid>${escapeXml(item.link)}</guid>\n` +
        `${item.date ? `      <pubDate>${new Date(item.date).toUTCString()}</pubDate>\n` : ''}      <description>${escapeXml(item.description)}</description>\n    </item>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${escapeXml(channel.title)}</title>\n    <link>${escapeXml(channel.link)}</link>\n    <description>${escapeXml(channel.description)}</description>\n${body}\n  </channel>\n</rss>\n`;
}

export interface RedirectRow {
  legacy_url: string;
  target_url: string;
  action: string;
  redirect: string;
}

/**
 * Redirect tables from `migration/url-map.csv` (PPDS §10):
 * - `fragments`: legacy `/#/…` URLs → target, applied in the browser (EXCEPTIONS E-01);
 * - `paths`: legacy path URLs → target, emitted as HTTP 301 rules in `_redirects`.
 */
export function redirectTables(urlMapCsv: string) {
  const rows = parseCsv(urlMapCsv) as unknown as RedirectRow[];
  const fragments: Record<string, string> = {};
  const paths: [from: string, to: string][] = [];
  for (const row of rows) {
    if (row.legacy_url.startsWith('/#')) fragments[row.legacy_url.slice(1)] = row.target_url;
    else if (row.legacy_url.startsWith('/') && row.redirect.startsWith('301'))
      paths.push([row.legacy_url, row.target_url]);
  }
  return { fragments, paths };
}

/** Cloudflare Pages / Netlify `_redirects` file. */
export function redirectsFile(rules: [from: string, to: string, status?: number][]): string {
  return `${rules.map(([from, to, status = 301]) => `${from} ${to} ${status}`).join('\n')}\n`;
}

/** Search facets emitted on every docs page (PPDS §7.5 `docsearch:version`, §7.6). */
export function pageFacets(model: PluginModel, page: NavPage) {
  return {
    plugin: model.config.id,
    version: model.config.currentVersion,
    section: page.sectionTitle,
  };
}
