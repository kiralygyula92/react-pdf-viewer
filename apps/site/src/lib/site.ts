import { getCollection } from 'astro:content';
import {
  absoluteUrl,
  loadPluginModel,
  loadReference,
  loadPortfolio,
  ogImagePath,
  twinPath,
  type NavNode,
  type NavPage,
  type PageMeta,
  type PluginModel,
  type PortfolioConfig,
} from 'ppds-kit';
import { resolve } from 'node:path';

/** Astro runs from apps/site (dev, build and preview); bundled pages cannot use import.meta.url. */
export const REPO_ROOT = `${resolve(process.cwd(), '../..').replace(/\\/g, '/')}/`;
export const CONTENT_ROOT = `${REPO_ROOT}content/react-pdf-viewer`;
export const CONTENT_PATH = 'content/react-pdf-viewer';
export const PLUGIN_ID = 'react-pdf-viewer';

let model: PluginModel | undefined;
let portfolio: PortfolioConfig | undefined;

// Cached for the build; re-read on every request in dev, so edits to nav.json, titles.json,
// plugin.config.json and portfolio.json show up without restarting the dev server.
export function getModel(): PluginModel {
  if (import.meta.env.DEV) return loadPluginModel(CONTENT_ROOT);
  model ??= loadPluginModel(CONTENT_ROOT);
  return model;
}

export function getPortfolio(): PortfolioConfig {
  if (import.meta.env.DEV) return loadPortfolio(`${REPO_ROOT}content/portfolio.json`);
  portfolio ??= loadPortfolio(`${REPO_ROOT}content/portfolio.json`);
  return portfolio;
}

export function origin(): string {
  return import.meta.env.SITE ?? 'https://react-pdf-viewer.pages.dev';
}

/** One-line descriptions of every docs page, keyed by pathname (P10: written once, in frontmatter). */
export async function getDescriptions(): Promise<Map<string, string>> {
  const entries = await getCollection('docs');
  const bySource = new Map(entries.map((entry) => [entry.id, entry.data.description]));
  const descriptions = new Map<string, string>();
  for (const page of getModel().pages) {
    const description = page.sourceFile ? bySource.get(page.sourceFile) : undefined;
    if (description) descriptions.set(page.pathname, description);
  }
  descriptions.set(
    `/${PLUGIN_ID}/api/`,
    'Generated reference for every public component, hook, function and type.',
  );
  return descriptions;
}

export function pageMeta(
  page: Pick<NavPage, 'pathname'>,
  title: string,
  description: string,
  docs = true,
): PageMeta {
  const config = getModel().config;
  return {
    title,
    description,
    canonical: absoluteUrl(origin(), page.pathname),
    ogImage: absoluteUrl(origin(), ogImagePath(page.pathname)),
    ogType: docs ? 'article' : 'website',
    language: 'en',
    ...(docs && {
      version: config.currentVersion,
      pluginId: config.id,
      categoryId: config.categoryId ?? null,
    }),
  };
}

export const twin = twinPath;

export const feeds = [
  { title: 'Changelog RSS', href: `/${PLUGIN_ID}/discover-more/changelog/rss.xml` },
];

/** Generated API pages injected under the Reference section of the sidebar (PPDS N3). */
export function injectedNav(): Record<string, NavNode[]> {
  const reference = loadReference(CONTENT_ROOT);
  return {
    [`/${PLUGIN_ID}/api-group`]: [...reference.symbols.values()]
      .map((entry) => ({ pathname: `/${PLUGIN_ID}/api/${entry.slug}/`, title: entry.schema.name }))
      .sort((a, b) => a.title.localeCompare(b.title)),
  };
}
