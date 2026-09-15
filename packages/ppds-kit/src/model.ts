import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { archetypeFor, sourceFileFor } from './archetypes.ts';
import type {
  NavNode,
  NavPage,
  PluginConfig,
  PluginModel,
  PortfolioConfig,
  SectionId,
} from './types.ts';

const SECTION_GROUP = /^\/[a-z0-9-]+\/([a-z0-9-]+)-group$/;

/** Maps a top-level virtual group (`/{id}/api-group`) to its canonical section id (PPDS §5). */
function sectionOf(groupPathname: string): SectionId {
  const slug = SECTION_GROUP.exec(groupPathname)?.[1];
  if (slug === 'api') return 'reference';
  const known: SectionId[] = [
    'getting-started',
    'features',
    'demos',
    'reference',
    'customization',
    'guides',
    'integrations',
    'resources',
    'migration',
    'discover-more',
    'design-resources',
  ];
  if (!slug || !known.includes(slug as SectionId)) {
    throw new Error(`Top-level nav node ${groupPathname} is not a section group`);
  }
  return slug as SectionId;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** Loads `plugin.config.json`, `nav.json` and `titles.json` and flattens the sidebar tree. */
export function loadPluginModel(contentRoot: string): PluginModel {
  const config = readJson<PluginConfig>(join(contentRoot, 'plugin.config.json'));
  const nav = readJson<NavNode[]>(join(contentRoot, 'nav.json'));
  const titles = readJson<Record<string, string>>(join(contentRoot, 'titles.json'));
  const prefix = `/${config.id}/`;
  const pages: NavPage[] = [];

  const titleOf = (node: NavNode) => node.title ?? titles[node.pathname];

  for (const sectionNode of nav) {
    const section = sectionOf(sectionNode.pathname);
    const sectionTitle = titleOf(sectionNode) ?? section;
    const visit = (node: NavNode, group: string | undefined) => {
      if (node.children) {
        for (const child of node.children) visit(child, node.subheader ?? group);
        return;
      }
      const title = titleOf(node);
      if (!title) throw new Error(`No title for ${node.pathname} (titles.json)`);
      const relative = node.pathname.slice(prefix.length);
      const isCapability = node.capabilityId !== undefined;
      pages.push({
        pathname: node.pathname,
        title,
        section,
        sectionTitle,
        ...(group !== undefined && { group }),
        ...(node.capabilityId !== undefined && { capabilityId: node.capabilityId }),
        ...(node.plan !== undefined && { plan: node.plan }),
        ...(node.lifecycle !== undefined && { lifecycle: node.lifecycle }),
        archetype: archetypeFor(relative, isCapability),
        sourceFile: sourceFileFor(relative, isCapability),
      });
    };
    visit(sectionNode, undefined);
  }

  return {
    contentRoot,
    config,
    nav,
    titles,
    pages,
    byPath: new Map(pages.map((p) => [p.pathname, p])),
  };
}

export function loadPortfolio(path: string): PortfolioConfig {
  return readJson<PortfolioConfig>(path);
}

/** Pages in sidebar order, excluding machine surfaces. */
export function contentPages(model: PluginModel): NavPage[] {
  return model.pages.filter((page) => page.archetype !== null);
}

/** Previous and next pages in sidebar order, for page footer navigation. */
export function neighbours(model: PluginModel, pathname: string) {
  const list = contentPages(model);
  const index = list.findIndex((page) => page.pathname === pathname);
  return { previous: index > 0 ? list[index - 1] : undefined, next: list[index + 1] };
}

/** The `.md` twin URL of a docs page (PPDS §7.7): `/{id}/zoom/` → `/{id}/zoom.md`. */
export function twinPath(pathname: string): string {
  return `${pathname.replace(/\/$/, '')}.md`;
}
