import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { twinPath } from '../model.ts';
import { absoluteUrl } from '../surfaces.ts';
import type { PluginModel } from '../types.ts';
import type { ReferenceEntry, ReferenceSchema, ReferenceStrings } from './types.ts';

export interface ReferenceSet {
  symbols: Map<string, ReferenceEntry>;
  slugOf: (name: string) => string;
}

/** `ConditionalRule` → `conditional-rule`, `CSS variables` → `css-variables`. */
export function symbolSlug(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/** Reads `reference/*.schema.json` + `*.strings.json` (empty before the reference is generated). */
export function loadReference(contentRoot: string): ReferenceSet {
  const dir = join(contentRoot, 'reference');
  const symbols = new Map<string, ReferenceEntry>();
  if (existsSync(dir)) {
    for (const file of readdirSync(dir)
      .filter((name) => name.endsWith('.schema.json'))
      .sort()) {
      const slug = file.replace(/\.schema\.json$/, '');
      const schema = JSON.parse(readFileSync(join(dir, file), 'utf8')) as ReferenceSchema;
      const stringsPath = join(dir, `${slug}.strings.json`);
      const strings = existsSync(stringsPath)
        ? (JSON.parse(readFileSync(stringsPath, 'utf8')) as ReferenceStrings)
        : {};
      symbols.set(schema.name, { slug, schema, strings });
    }
  }
  return { symbols, slugOf: (name) => symbols.get(name)?.slug ?? symbolSlug(name) };
}

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const stripHtml = (text: string) =>
  text.replace(/<code>(.*?)<\/code>/g, '`$1`').replace(/<[^>]+>/g, '');

export const KIND_LABEL: Record<ReferenceSchema['kind'], string> = {
  component: 'Component',
  function: 'Function',
  hook: 'Hook',
  type: 'Type',
  'setting-group': 'Settings',
  command: 'Commands',
  event: 'Event',
  filter: 'Filter',
};

/** Heading for a reference options table, by kind. */
export function optionsHeading(kind: ReferenceSchema['kind']): string {
  if (kind === 'component') return 'Props';
  if (kind === 'setting-group') return 'Settings';
  if (kind === 'command') return 'Commands';
  if (kind === 'type') return 'Properties';
  return 'Options';
}

/** A symbol's one-line description as plain Markdown. */
export function symbolDescription(entry: ReferenceEntry): string {
  return stripHtml(entry.strings.symbolDescription ?? '');
}

/** Markdown for one reference page (archetype E), used by `.md` twins and llms consumers. */
export function referenceMarkdown(
  entry: ReferenceEntry,
  _set: ReferenceSet,
  model: PluginModel,
  origin: string,
  level: 1 | 2,
): string {
  const heading = [
    `${'#'.repeat(level)} ${entry.schema.name} reference`,
    '',
    symbolDescription(entry),
    '',
  ];
  return `${heading.join('\n')}\n${referenceBody(entry, model, origin, level === 1 ? 2 : 3)}`;
}

/** The sections of a reference page below its title and description, from `Used by` to `Source`. */
export function referenceBody(
  entry: ReferenceEntry,
  model: PluginModel,
  origin: string,
  level: 2 | 3,
): string {
  const { schema, strings } = entry;
  const h2 = '#'.repeat(level);
  const lines: string[] = [];
  lines.push(`${h2} Used by`, '');
  const usedBy = schema.usedBy ?? [];
  lines.push(
    ...(usedBy.length
      ? usedBy.map(
          (pathname) =>
            `- [${model.byPath.get(pathname)?.title ?? pathname}](${absoluteUrl(origin, twinPath(pathname))})`,
        )
      : ['Internal building block: not documented on a capability page.']),
    '',
  );
  lines.push(`${h2} Import`, '', '```ts', ...(schema.imports ?? []), '```', '');
  if (schema.signature)
    lines.push(
      `Signature: \`${schema.signature}\`${schema.returns ? ` → \`${schema.returns}\`` : ''}`,
      '',
    );
  const table = (
    title: string,
    rows: Record<
      string,
      { type: { name: string; description?: string }; default?: unknown; required?: boolean }
    >,
    descriptions: Record<string, string> = {},
  ) => {
    const names = Object.keys(rows);
    if (!names.length) return;
    lines.push(
      `${h2} ${title}`,
      '',
      '| Name | Type | Default | Required | Description |',
      '| --- | --- | --- | --- | --- |',
    );
    for (const name of names) {
      const option = rows[name];
      if (!option) continue;
      lines.push(
        `| \`${cell(name)}\` | \`${cell(option.type.description ?? option.type.name)}\` | ${option.default === undefined ? '—' : `\`${cell(String(option.default))}\``} | ${option.required ? 'Yes' : 'No'} | ${cell(stripHtml(descriptions[name] ?? ''))} |`,
      );
    }
    lines.push('');
  };
  table(optionsHeading(schema.kind), schema.options ?? {}, strings.optionDescriptions);
  table('Events', schema.events ?? {}, strings.eventDescriptions);
  if (schema.classes?.length) {
    lines.push(`${h2} CSS classes`, '', '| Key | Class | Description |', '| --- | --- | --- |');
    for (const entryClass of schema.classes) {
      lines.push(
        `| ${entryClass.key} | \`${entryClass.className}\` | ${cell(strings.classDescriptions?.[entryClass.key]?.description ?? '')} |`,
      );
    }
    lines.push('');
  }
  lines.push(
    `${h2} Source`,
    '',
    `[${schema.filename}](${schema.sourceUrl ?? `${model.config.repo}/blob/main/${schema.filename}`})`,
    '',
  );
  return `${lines.join('\n')}\n`;
}

/** Markdown for the generated API index (archetype K). */
export function referenceIndexMarkdown(
  model: PluginModel,
  set: ReferenceSet,
  origin: string,
): string {
  const heading = [
    `# API reference`,
    '',
    'Generated reference for every public component, hook, function and type.',
    '',
  ];
  return `${heading.join('\n')}\n${referenceIndexBody(model, set, origin)}`;
}

/** The API index below its title: one group per kind, one line per symbol. */
export function referenceIndexBody(model: PluginModel, set: ReferenceSet, origin: string): string {
  const lines: string[] = [];
  const byKind = new Map<string, ReferenceEntry[]>();
  for (const entry of set.symbols.values()) {
    const list = byKind.get(entry.schema.kind) ?? [];
    list.push(entry);
    byKind.set(entry.schema.kind, list);
  }
  for (const [kind, entries] of byKind) {
    lines.push(`## ${KIND_LABEL[kind as ReferenceSchema['kind']]}`, '');
    for (const entry of entries) {
      lines.push(
        `- [${entry.schema.name}](${absoluteUrl(origin, twinPath(`/${model.config.id}/api/${entry.slug}/`))}): ${stripHtml(entry.strings.symbolDescription ?? '')}`,
      );
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}
