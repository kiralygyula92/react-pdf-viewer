import type { Archetype } from './types.ts';

/**
 * Required blocks per archetype (PPDS v1.1 §6), expressed as the Markdown headings a page body must
 * contain, in order. Blocks rendered by templates (H1, subtitle, chips, card grids, footer
 * actions, generated API links) are not listed: the templates always emit them.
 *
 * A heading entry is matched case-sensitively against `## Heading` lines; `/regex/` entries match
 * any heading of that level.
 */
export interface BlockSpec {
  level: 2 | 3;
  text: string | RegExp;
  label: string;
}

const h2 = (text: string | RegExp, label = String(text)): BlockSpec => ({ level: 2, text, label });

export const REQUIRED_BLOCKS: Record<Archetype, BlockSpec[]> = {
  A: [h2('Introduction'), h2(/^Why .+/, 'Why {Plugin}'), h2('Start now')],
  B: [h2('Basics'), h2('Customization'), h2('Limitations')],
  C: [],
  D: [],
  E: [],
  F: [
    h2('Prerequisites'),
    h2('Installation'),
    h2('Minimal example'),
    h2('Verify'),
    h2('Next steps'),
  ],
  G: [],
  H: [],
  I: [],
  J: [h2('Related')],
  K: [],
  L: [h2('What this shows'), h2('Source')],
};

/** Extra required blocks for archetype J variants, keyed by path pattern (§6 J). */
export const GUIDE_VARIANTS: { pattern: RegExp; name: string; blocks: BlockSpec[] }[] = [
  {
    pattern: /\/integrations\/[a-z0-9-]+\/$/,
    name: 'Integration target',
    blocks: [h2('Before you start'), h2('Setup'), h2('Verify'), h2('Known issues')],
  },
  {
    pattern: /\/migration\/[a-z0-9-]+\/$/,
    name: 'Migration',
    blocks: [h2('Breaking changes'), h2('Step by step'), h2('Verify')],
  },
  {
    pattern: /\/getting-started\/support\/$/,
    name: 'Support',
    blocks: [h2('Free channels'), h2('Reporting a security issue')],
  },
  {
    pattern: /\/getting-started\/versions\/$/,
    name: 'Versions',
    blocks: [h2('Supported versions'), h2('Versioning policy'), h2('Older versions')],
  },
  {
    pattern: /\/customization\/$/,
    name: 'Customization index',
    blocks: [h2('Ways to customize')],
  },
];

/** Section index paths that use archetype K. */
const SECTION_INDEX = /^(api|migration|demos)\/$/;

/**
 * The archetype a docs page must use, derived from its path relative to the plugin namespace.
 * `isCapability` marks capability nodes (they carry a `capabilityId` in nav data).
 * Returns null for machine surfaces (§7.7).
 */
export function archetypeFor(relativePath: string, isCapability: boolean): Archetype | null {
  const rest = relativePath;
  if (rest === '') return 'A';
  if (/\.[a-z]+$/.test(rest)) return null;
  if (rest === 'all-features/') return 'C';
  if (rest === 'features/') return 'D';
  if (/^getting-started\/(installation|usage|requirements)\/$/.test(rest)) return 'F';
  if (/^getting-started\/(faq|support|versions)\/$/.test(rest)) return 'J';
  if (SECTION_INDEX.test(rest)) return 'K';
  if (/^api\/[a-z0-9-]+\/$/.test(rest)) return 'E';
  if (/^demos\/[a-z0-9-]+\/$/.test(rest)) return 'L';
  if (/^(customization|guides|integrations|migration|resources)\/([a-z0-9-]+\/)?$/.test(rest))
    return 'J';
  if (/^discover-more\/[a-z0-9-]+\/$/.test(rest)) return 'I';
  if (isCapability) return 'B';
  throw new Error(`No archetype matches "${relativePath}"`);
}

/**
 * Content file for a docs page, relative to the plugin content root (PPDS §8.1), or null when the
 * page is generated (the API index and machine surfaces).
 */
export function sourceFileFor(relativePath: string, isCapability: boolean): string | null {
  const rest = relativePath.replace(/\/$/, '');
  if (relativePath === '') return 'getting-started/overview.mdx';
  if (/\.[a-z]+$/.test(relativePath) || rest === 'api' || rest.startsWith('api/')) return null;
  if (isCapability) return `features/${rest}/index.mdx`;
  if (rest === 'all-features') return 'features/index.mdx';
  if (rest.startsWith('demos/')) return `${rest}/index.mdx`;
  if (/^(customization|migration|guides|integrations|resources|discover-more)$/.test(rest))
    return `${rest}/index.mdx`;
  return `${rest}.mdx`;
}
