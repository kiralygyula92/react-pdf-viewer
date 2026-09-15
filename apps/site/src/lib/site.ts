import { getCollection } from 'astro:content';
import {
  absoluteUrl,
  loadPluginModel,
  loadPortfolio,
  ogImagePath,
  twinPath,
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

export function getModel(): PluginModel {
  model ??= loadPluginModel(CONTENT_ROOT);
  return model;
}

export function getPortfolio(): PortfolioConfig {
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
  descriptions.set(
    `/${PLUGIN_ID}/llms.txt`,
    'Machine-readable index of this documentation for AI agents.',
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

/** Marketing header menus (PPDS §2.1): every entry carries its own positioning. */
export function marketingMenus() {
  const config = getModel().config;
  return [
    {
      label: 'Products',
      entries: [
        { title: config.name, description: config.tagline, href: `/products/${config.id}/` },
      ],
    },
    {
      label: 'Docs',
      entries: [
        {
          title: `${config.name} docs`,
          description: 'Installation, features, guides and API reference.',
          href: `/${config.id}/`,
        },
      ],
    },
  ];
}

export function marketingLinks() {
  return [
    { title: 'Support', href: `/${PLUGIN_ID}/getting-started/support/` },
    { title: 'Changelog', href: `/${PLUGIN_ID}/discover-more/changelog/` },
  ];
}

export const feeds = [
  { title: 'Changelog RSS', href: `/${PLUGIN_ID}/discover-more/changelog/rss.xml` },
];
