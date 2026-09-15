import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stringify } from 'yaml';
import { GUIDE_VARIANTS, REQUIRED_BLOCKS } from './archetypes.ts';
import type { NavPage, PluginModel } from './types.ts';

const TODO_DESCRIPTION = 'TODO: one-line description (reused in nav, meta and llms.txt).';

function frontmatterFor(model: PluginModel, page: NavPage): Record<string, unknown> {
  const base = { title: page.title, description: TODO_DESCRIPTION };
  if (page.archetype !== 'B') return base;
  return {
    pluginId: model.config.id,
    capabilityId: page.capabilityId,
    title: page.title,
    description: TODO_DESCRIPTION,
    group: page.group,
    plan: page.plan,
    ...(page.lifecycle && { lifecycle: page.lifecycle }),
    symbols: [],
    links: { issues: model.config.links?.['issues'] ?? model.config.repo },
  };
}

function headingLabel(label: string, model: PluginModel): string {
  return label.replace('{Plugin}', model.config.name);
}

/** Body stub: the archetype's required blocks as empty headings with TODO markers (brief §3.2). */
function bodyFor(model: PluginModel, page: NavPage): string {
  if (!page.archetype) return '';
  const blocks = [...REQUIRED_BLOCKS[page.archetype]];
  if (page.archetype === 'J') {
    const variant = GUIDE_VARIANTS.find((candidate) => candidate.pattern.test(page.pathname));
    if (variant) blocks.unshift(...variant.blocks);
  }
  const sections = blocks.map(
    (block) =>
      `${'#'.repeat(block.level)} ${headingLabel(block.label, model)}\n\nTODO: ${headingLabel(block.label, model)}.\n`,
  );
  return sections.length > 0 ? `\n${sections.join('\n')}` : '\nTODO: page body.\n';
}

/**
 * Creates a valid stub for every nav page that has no content file yet (PPDS brief Phase 3).
 * Existing files are never touched. Returns the files created.
 */
export function scaffold(model: PluginModel): string[] {
  const created: string[] = [];
  for (const page of model.pages) {
    if (!page.sourceFile) continue;
    const path = join(model.contentRoot, page.sourceFile);
    if (existsSync(path)) continue;
    mkdirSync(dirname(path), { recursive: true });
    const frontmatter = stringify(frontmatterFor(model, page)).trimEnd();
    writeFileSync(path, `---\n${frontmatter}\n---\n${bodyFor(model, page)}`);
    created.push(page.sourceFile);
  }
  return created;
}
