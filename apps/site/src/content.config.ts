import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

/**
 * Docs pages of the plugin (PPDS §8.1). Entry ids are the file paths relative to the content
 * root, which is how nav pages refer to them (`sourceFile`). Capability frontmatter is validated
 * in full against docs/ppds/plugin-site.schema.json by the conformance check.
 */
const docs = defineCollection({
  loader: glob({
    base: '../../content/react-pdf-viewer',
    pattern: '**/*.{md,mdx}',
    generateId: ({ entry }) => entry,
  }),
  schema: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1).max(300),
      pluginId: z.string().optional(),
      capabilityId: z.string().optional(),
      group: z.string().optional(),
      plan: z.string().optional(),
      lifecycle: z.enum(['new', 'preview', 'beta', 'planned', 'deprecated', 'legacy']).optional(),
      symbols: z.array(z.string()).optional(),
      links: z.record(z.string(), z.string()).optional(),
      /** Archetype L: capability ids the scenario uses. */
      capabilities: z.array(z.string()).optional(),
      /** Archetype I: publication date. */
      date: z.string().optional(),
    })
    .strict(),
});

export const collections = { docs };
