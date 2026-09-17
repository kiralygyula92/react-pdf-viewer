/**
 * Docs pages of the plugin (PPDS §8.1), compiled from MDX at build time. Keys are the file paths
 * relative to the content root, which is how nav pages refer to them (`sourceFile`).
 */
import type { ComponentType } from 'react';
import type { Heading } from './mdx/headings.ts';

export interface DocFrontmatter {
  title: string;
  description: string;
  pluginId?: string;
  capabilityId?: string;
  group?: string;
  plan?: string;
  lifecycle?: 'new' | 'preview' | 'beta' | 'planned' | 'deprecated' | 'legacy';
  symbols?: string[];
  links?: Record<string, string>;
  /** Archetype L: capability ids the scenario uses. */
  capabilities?: string[];
  /** Archetype I: publication date. */
  date?: string;
}

export interface DocModule {
  default: ComponentType<{ components?: Record<string, unknown> }>;
  frontmatter: DocFrontmatter;
  headings: Heading[];
}

const CONTENT_PREFIX = '../../../content/react-pdf-viewer/';

const modules = import.meta.glob<DocModule>('../../../content/react-pdf-viewer/**/*.mdx', {
  eager: true,
});

/** Every docs page, keyed by its path relative to the content root. */
export const docs = new Map<string, DocModule>(
  Object.entries(modules).map(([path, module]) => [path.slice(CONTENT_PREFIX.length), module]),
);

export function getDoc(sourceFile: string): DocModule {
  const module = docs.get(sourceFile);
  if (!module) throw new Error(`Missing content file ${sourceFile}`);
  return module;
}

/** Sources of the colocated demo files (PPDS §7.2), keyed the same way. */
const demoSources = import.meta.glob<string>('../../../content/react-pdf-viewer/**/demo-*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export function demoSource(id: string): string {
  const source = demoSources[`${CONTENT_PREFIX}${id}.tsx`];
  if (source === undefined)
    throw new Error(`Demo "${id}" not found (expected content/react-pdf-viewer/${id}.tsx)`);
  return source;
}
