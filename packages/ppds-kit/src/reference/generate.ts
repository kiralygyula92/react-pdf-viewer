/**
 * Reference generator (PPDS §8.4–8.5, brief Phase 4). Sources of truth, all read from the plugin:
 *
 * 1. TypeScript declarations and TSDoc of every public export of the entry (TypeDoc).
 *    Components get their `…Props` interface as options (`on…` callbacks as events), hooks and
 *    functions their options-object parameter, interfaces their properties, string-literal unions
 *    their members, constants their runtime values (read from the built package).
 *    Defaults come from `@defaultValue`, or a “Default `x`.” sentence in the summary.
 * 2. TSDoc tags: `@cssClass` / `@cssAttribute` (styling hooks of a component) and `@shortcut`
 *    (a “Keyboard shortcuts” command group).
 * 3. The stylesheets the entry imports: every `--custom-property` with its fallback value, and
 *    theme presets (class rules that only set custom properties).
 *
 * `.schema.json` files are always overwritten; `.strings.json` files only ever gain keys (P6).
 * `--check` regenerates in memory and fails when a schema file differs (conformance check 10).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Application, type JSONOutput, type NormalizedPath } from 'typedoc';
import { parseDoc } from '../markdown.ts';
import { loadPluginModel } from '../model.ts';
import { symbolSlug } from './render.ts';
import type { ReferenceOption, ReferenceSchema, ReferenceStrings } from './types.ts';

type Reflection = JSONOutput.DeclarationReflection;
type SomeType = JSONOutput.SomeType;
type CommentPart = JSONOutput.CommentDisplayPart;

interface Generated {
  schema: ReferenceSchema;
  strings: ReferenceStrings;
}

export interface ReferenceOptions {
  contentRoot: string;
  entry: string;
  check: boolean;
}

const posix = (path: string) => path.split('\\').join('/');
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function findUp(start: string, name: string): string {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, name))) return join(dir, name);
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`${name} not found above ${start}`);
    dir = parent;
  }
}

// ── Type rendering ──────────────────────────────────────────────────────────
function typeToString(type: SomeType | undefined, depth = 0): string {
  if (!type) return 'unknown';
  if (depth > 6) return '…';
  const inner = (t: SomeType | undefined) => typeToString(t, depth + 1);
  switch (type.type) {
    case 'intrinsic':
      return type.name;
    case 'literal':
      return type.value === null
        ? 'null'
        : typeof type.value === 'string'
          ? `'${type.value}'`
          : String(type.value);
    case 'reference': {
      const name = type.name === '__module' ? 'module' : type.name.replace(/^React\./, '');
      return type.typeArguments?.length
        ? `${name}<${type.typeArguments.map(inner).join(', ')}>`
        : name;
    }
    case 'union': {
      const parts = type.types
        .filter((t) => !(t.type === 'intrinsic' && t.name === 'undefined'))
        .map(inner);
      return parts.length ? parts.join(' | ') : 'undefined';
    }
    case 'intersection':
      return type.types.map(inner).join(' & ');
    case 'array': {
      const element = inner(type.elementType);
      return /[|&]/.test(element) ? `(${element})[]` : `${element}[]`;
    }
    case 'tuple':
      return `[${(type.elements ?? []).map(inner).join(', ')}]`;
    case 'typeOperator':
      return `${type.operator} ${inner(type.target)}`;
    case 'query':
      return `typeof ${inner(type.queryType)}`;
    case 'indexedAccess':
      return `${inner(type.objectType)}[${inner(type.indexType)}]`;
    case 'templateLiteral':
      return 'string';
    case 'reflection': {
      const declaration = type.declaration;
      const signature = declaration.signatures?.[0];
      if (signature) return signatureToString(signature, depth + 1, true);
      const members = (declaration.children ?? []).map(
        (child) => `${child.name}${child.flags.isOptional ? '?' : ''}: ${inner(child.type)}`,
      );
      return `{ ${members.join('; ')} }`;
    }
    default:
      return 'unknown';
  }
}

function signatureToString(
  signature: JSONOutput.SignatureReflection,
  depth = 0,
  arrow = false,
  name = '',
): string {
  const params = (signature.parameters ?? []).map(
    (param) =>
      `${param.flags.isRest ? '...' : ''}${param.name}${param.flags.isOptional || param.defaultValue ? '?' : ''}: ${typeToString(param.type, depth + 1)}`,
  );
  const returns = typeToString(signature.type, depth + 1);
  return arrow
    ? `(${params.join(', ')}) => ${returns}`
    : `${name}(${params.join(', ')}): ${returns}`;
}

// ── Comments ────────────────────────────────────────────────────────────────
function partsToHtml(
  parts: CommentPart[] | undefined,
  linkFor: (target: string) => string | undefined,
): string {
  return (parts ?? [])
    .map((part) => {
      if (part.kind === 'code') {
        const code = part.text.replace(/^`+|`+$/g, '');
        return part.text.startsWith('```')
          ? `<pre><code>${escapeHtml(code.replace(/^\w*\n/, ''))}</code></pre>`
          : `<code>${escapeHtml(code)}</code>`;
      }
      if (part.kind === 'inline-tag') {
        const href = linkFor(part.text);
        return href
          ? `<a href="${href}"><code>${escapeHtml(part.text)}</code></a>`
          : `<code>${escapeHtml(part.text)}</code>`;
      }
      return escapeHtml(part.text);
    })
    .join('')
    .trim();
}

const partsToText = (parts: CommentPart[] | undefined) =>
  (parts ?? [])
    .map((part) => part.text)
    .join('')
    .trim();

/** Removes the trailing “Default `x`.” sentence: the default has its own column. */
const withoutDefaultSentence = (html: string) =>
  html.replace(/\s*Defaults? (?:to )?<code>[^<]*<\/code>\.?(?=\s*$|\s*\()/, '').trim();

function defaultOf(
  reflection: Reflection | JSONOutput.SignatureReflection | undefined,
): string | undefined {
  const comment = reflection?.comment;
  if (!comment) return undefined;
  const tag = comment.blockTags?.find(
    (block) => block.tag === '@defaultValue' || block.tag === '@default',
  );
  if (tag)
    return partsToText(tag.content)
      .replace(/^```\w*\n?|\n?```$/g, '')
      .replace(/`/g, '')
      .trim();
  const summary = partsToText(comment.summary);
  return /Defaults? (?:to )?`([^`]+)`/.exec(summary)?.[1];
}

// ── Generation ──────────────────────────────────────────────────────────────
export async function generateReference(
  options: Omit<ReferenceOptions, 'check'>,
): Promise<Map<string, Generated>> {
  const entry = resolve(options.entry);
  const model = loadPluginModel(options.contentRoot);
  const repoRoot = dirname(findUp(entry, 'pnpm-workspace.yaml'));
  const packageJsonPath = findUp(dirname(entry), 'package.json');
  const packageDir = dirname(packageJsonPath);
  const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    name: string;
    exports?: Record<string, unknown>;
  };
  const prefix = `/${model.config.id}/api/`;
  const sourceUrl = (file: string, line?: number) =>
    `${model.config.repo}/blob/main/${posix(file)}${line ? `#L${line}` : ''}`;

  const app = await Application.bootstrap({
    entryPoints: [posix(entry)],
    tsconfig: posix(findUp(dirname(entry), 'tsconfig.json')),
    readme: 'none',
    excludePrivate: true,
    excludeInternal: true,
    skipErrorChecking: true,
    sort: ['source-order'],
    logLevel: 'Error',
    blockTags: [
      '@defaultValue',
      '@default',
      '@example',
      '@remarks',
      '@see',
      '@deprecated',
      '@packageDocumentation',
      '@cssClass',
      '@cssAttribute',
      '@shortcut',
    ],
  });
  const project = await app.convert();
  if (!project) throw new Error('TypeDoc could not convert the entry point');
  const json = app.serializer.projectToObject(project, posix(repoRoot) as NormalizedPath);
  const reflections = json.children ?? [];
  const byId = new Map<number, Reflection>();
  const index = (items: Reflection[] | undefined) => {
    for (const item of items ?? []) {
      byId.set(item.id, item);
      index(item.children);
    }
  };
  index(reflections);
  const exported = new Set(reflections.map((reflection) => reflection.name));
  const linkFor = (name: string) =>
    exported.has(name) ? `${prefix}${symbolSlug(name)}/` : undefined;
  const html = (parts: CommentPart[] | undefined) => partsToHtml(parts, linkFor);
  const fileOf = (reflection: Reflection) => {
    const source = reflection.sources?.[0] ?? reflection.signatures?.[0]?.sources?.[0];
    const file = source
      ? posix(relative(repoRoot, join(dirname(entry), source.fileName)))
      : posix(relative(repoRoot, entry));
    return { file, line: source?.line };
  };
  const importLine = (name: string, typeOnly: boolean) =>
    `import ${typeOnly ? 'type ' : ''}{ ${name} } from '${manifest.name}';`;

  /** Properties of an interface (including inherited ones) as options and events. */
  const membersOf = (target: Reflection | undefined, splitEvents: boolean) => {
    const optionsOut: Record<string, ReferenceOption> = {};
    const eventsOut: Record<string, ReferenceOption> = {};
    const optionProse: Record<string, string> = {};
    const eventProse: Record<string, string> = {};
    // Own members first, then inherited ones, each in source order.
    const children = [...(target?.children ?? [])].sort(
      (a, b) => Number(Boolean(a.flags.isInherited)) - Number(Boolean(b.flags.isInherited)),
    );
    for (const child of children) {
      const signature = child.signatures?.[0];
      const typeText = signature ? signatureToString(signature, 0, true) : typeToString(child.type);
      const option: ReferenceOption = {
        type: {
          name:
            child.type?.type === 'reflection' || signature
              ? 'func'
              : typeText.includes('|')
                ? 'union'
                : typeText,
          description: typeText,
        },
        ...(!child.flags.isOptional && !signature ? { required: true } : {}),
      };
      const fallback = defaultOf(child) ?? defaultOf(signature);
      if (fallback !== undefined) option.default = fallback;
      if (
        (child.comment ?? signature?.comment)?.blockTags?.some((tag) => tag.tag === '@deprecated')
      )
        option.deprecated = true;
      const prose = withoutDefaultSentence(html((child.comment ?? signature?.comment)?.summary));
      const isEvent =
        splitEvents &&
        /^on[A-Z]/.test(child.name) &&
        (child.type?.type === 'reflection' || child.type?.type === 'union');
      if (isEvent) {
        eventsOut[child.name] = option;
        if (prose) eventProse[child.name] = prose;
      } else {
        optionsOut[child.name] = option;
        if (prose) optionProse[child.name] = prose;
      }
    }
    return { optionsOut, eventsOut, optionProse, eventProse };
  };

  const findPropsInterface = (type: SomeType | undefined): Reflection | undefined => {
    if (!type) return undefined;
    if (type.type === 'reference' && /Props$/.test(type.name) && typeof type.target === 'number')
      return byId.get(type.target);
    const nested: SomeType[] = [];
    if (type.type === 'reference') nested.push(...(type.typeArguments ?? []));
    if (type.type === 'intersection' || type.type === 'union') nested.push(...type.types);
    if (type.type === 'reflection') {
      for (const signature of type.declaration.signatures ?? [])
        nested.push(
          ...(signature.parameters ?? [])
            .map((p) => p.type)
            .filter((t): t is SomeType => t !== undefined),
        );
    }
    for (const candidate of nested) {
      const found = findPropsInterface(candidate);
      if (found) return found;
    }
    return undefined;
  };

  // Runtime values of exported constants (e.g. default label sets), from the built package.
  const builtEntry = (() => {
    const root = manifest.exports?.['.'];
    const target =
      typeof root === 'string' ? root : (root as { import?: string } | undefined)?.import;
    return target ? join(packageDir, target) : undefined;
  })();
  let runtime: Record<string, unknown> = {};
  if (builtEntry && existsSync(builtEntry)) {
    try {
      runtime = (await import(pathToFileURL(builtEntry).href)) as Record<string, unknown>;
    } catch {
      runtime = {};
    }
  }
  const valueToDefault = (value: unknown): string | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'string') return `'${value}'`;
    if (typeof value === 'function') return 'function';
    if (value === null || typeof value !== 'object') return String(value);
    return JSON.stringify(value);
  };

  const out = new Map<string, Generated>();
  const shortcuts: { keys: string; prose: string; file: string; line?: number | undefined }[] = [];
  const tagsOf = (
    reflection: Reflection | JSONOutput.SignatureReflection | undefined,
    tag: string,
  ) =>
    (reflection?.comment?.blockTags ?? [])
      .filter((block) => block.tag === tag)
      .map((block) => {
        const text = partsToText(block.content);
        const [name = '', ...rest] = text.split(/\s+/);
        const restParts = html(block.content).replace(
          new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`),
          '',
        );
        return { name, prose: restParts || escapeHtml(rest.join(' ')) };
      });

  for (const reflection of reflections) {
    const { file, line } = fileOf(reflection);
    const signature = reflection.signatures?.[0];
    const comment = reflection.comment ?? signature?.comment;
    const summary = html(comment?.summary);
    const base = {
      name: reflection.name,
      filename: file,
      sourceUrl: sourceUrl(file, line),
      usedBy: [] as string[],
    };
    let generated: Generated;

    // Tags collected from the reflection and its members.
    const collectShortcuts = (item: Reflection) => {
      for (const tag of tagsOf(item, '@shortcut'))
        shortcuts.push({ keys: tag.name, prose: tag.prose, ...fileOf(item) });
      for (const child of item.children ?? []) collectShortcuts(child);
    };
    collectShortcuts(reflection);

    if (reflection.kind === 32 /* Variable */) {
      const props = findPropsInterface(reflection.type);
      if (props && /^[A-Z]/.test(reflection.name)) {
        const members = membersOf(props, true);
        const classes = [
          ...tagsOf(reflection, '@cssClass').map((tag) => ({ ...tag, className: `.${tag.name}` })),
          ...tagsOf(reflection, '@cssAttribute').map((tag) => ({
            ...tag,
            className: `[${tag.name}]`,
          })),
        ];
        generated = {
          schema: {
            ...base,
            kind: 'component',
            imports: [importLine(reflection.name, false)],
            options: members.optionsOut,
            events: members.eventsOut,
            ...(classes.length
              ? { classes: classes.map((c) => ({ key: c.name, className: c.className })) }
              : {}),
            inheritance: { symbol: props.name, pathname: `${prefix}${symbolSlug(props.name)}/` },
          },
          strings: {
            symbolDescription: summary,
            optionDescriptions: members.optionProse,
            eventDescriptions: members.eventProse,
            ...(classes.length
              ? {
                  classDescriptions: Object.fromEntries(
                    classes.map((c) => [c.name, { description: c.prose }]),
                  ),
                }
              : {}),
          },
        };
      } else {
        const typeTarget =
          reflection.type?.type === 'reference' && typeof reflection.type.target === 'number'
            ? byId.get(reflection.type.target)
            : undefined;
        const members = membersOf(typeTarget, false);
        const value = runtime[reflection.name];
        if (value && typeof value === 'object') {
          for (const [key, option] of Object.entries(members.optionsOut)) {
            const fallback = valueToDefault((value as Record<string, unknown>)[key]);
            if (fallback !== undefined) option.default = fallback;
          }
        }
        generated = {
          schema: {
            ...base,
            kind: 'type',
            imports: [importLine(reflection.name, false)],
            signature: `const ${reflection.name}: ${typeToString(reflection.type)}`,
            options: members.optionsOut,
          },
          strings: { symbolDescription: summary, optionDescriptions: members.optionProse },
        };
      }
    } else if (reflection.kind === 64 /* Function */ && signature) {
      const optionParam = [...(signature.parameters ?? [])]
        .reverse()
        .find(
          (param) =>
            param.type?.type === 'reference' &&
            typeof param.type.target === 'number' &&
            byId.get(param.type.target)?.kind === 256,
        );
      const target =
        optionParam?.type?.type === 'reference' && typeof optionParam.type.target === 'number'
          ? byId.get(optionParam.type.target)
          : undefined;
      const members = membersOf(target, false);
      generated = {
        schema: {
          ...base,
          kind: /^use[A-Z]/.test(reflection.name) ? 'hook' : 'function',
          imports: [importLine(reflection.name, false)],
          signature: signatureToString(signature, 0, false, reflection.name),
          returns: typeToString(signature.type),
          options: members.optionsOut,
          ...(target
            ? {
                inheritance: {
                  symbol: target.name,
                  pathname: `${prefix}${symbolSlug(target.name)}/`,
                },
              }
            : {}),
        },
        strings: { symbolDescription: summary, optionDescriptions: members.optionProse },
      };
    } else if (reflection.kind === 256 /* Interface */) {
      const members = membersOf(reflection, false);
      const parent = reflection.extendedTypes?.[0];
      generated = {
        schema: {
          ...base,
          kind: 'type',
          imports: [importLine(reflection.name, true)],
          options: members.optionsOut,
          inheritance:
            parent && parent.type === 'reference'
              ? {
                  symbol: parent.name,
                  pathname: exported.has(parent.name) ? `${prefix}${symbolSlug(parent.name)}/` : '',
                }
              : null,
        },
        strings: { symbolDescription: summary, optionDescriptions: members.optionProse },
      };
    } else {
      // Type alias: string-literal unions list their members; other aliases show the definition.
      const type = reflection.type;
      const literals =
        type?.type === 'union' && type.types.every((t) => t.type === 'literal')
          ? type.types
          : undefined;
      const optionsOut: Record<string, ReferenceOption> = {};
      const optionProse: Record<string, string> = {};
      if (literals && type?.type === 'union') {
        literals.forEach((literal, i) => {
          const key = literal.type === 'literal' ? String(literal.value) : String(i);
          optionsOut[key] = { type: { name: 'literal', description: typeToString(literal) } };
          const prose = html(type.elementSummaries?.[i]);
          if (prose) optionProse[key] = prose;
        });
      }
      generated = {
        schema: {
          ...base,
          kind: 'type',
          imports: [importLine(reflection.name, true)],
          signature: `type ${reflection.name}${reflection.typeParameters?.length ? `<${reflection.typeParameters.map((p) => p.name).join(', ')}>` : ''} = ${typeToString(type)}`,
          ...(literals ? { options: optionsOut } : {}),
        },
        strings: {
          symbolDescription: summary,
          ...(literals ? { optionDescriptions: optionProse } : {}),
        },
      };
    }
    out.set(reflection.name, generated);
  }

  if (shortcuts.length) {
    const first = shortcuts[0];
    out.set('Keyboard shortcuts', {
      schema: {
        name: 'Keyboard shortcuts',
        kind: 'command',
        options: Object.fromEntries(
          shortcuts.map((s) => [
            s.keys,
            { type: { name: 'key', description: s.keys.split('+').join(' + ') } },
          ]),
        ),
        usedBy: [],
        filename: first?.file ?? posix(relative(repoRoot, entry)),
        sourceUrl: sourceUrl(first?.file ?? posix(relative(repoRoot, entry)), first?.line),
      },
      strings: {
        symbolDescription:
          'Keys the component handles, generated from <code>@shortcut</code> tags next to the implementation.',
        optionDescriptions: Object.fromEntries(shortcuts.map((s) => [s.keys, s.prose])),
      },
    });
  }

  // ── Stylesheets imported by the entry ─────────────────────────────────────
  const cssFiles = [
    ...readFileSync(entry, 'utf8').matchAll(/^import\s+['"](\.[^'"]+\.css)['"]/gm),
  ].map((m) => join(dirname(entry), m[1] ?? ''));
  if (cssFiles.length) {
    const variables = new Map<string, { fallback?: string; file: string; line: number }>();
    const presets = new Map<
      string,
      { values: Record<string, string>; file: string; line: number }
    >();
    for (const cssFile of cssFiles) {
      const css = readFileSync(cssFile, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (comment) =>
        comment.replace(/[^\n]/g, ' '),
      );
      const lineAt = (offset: number) => css.slice(0, offset).split('\n').length;
      const rel = posix(relative(repoRoot, cssFile));
      for (const match of css.matchAll(
        /var\(\s*(--[a-z0-9-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*?))?\s*\)/gi,
      )) {
        const name = match[1] ?? '';
        if (name.startsWith('--_')) continue;
        const existing = variables.get(name);
        if (!existing)
          variables.set(name, {
            ...(match[2] ? { fallback: match[2].trim() } : {}),
            file: rel,
            line: lineAt(match.index ?? 0),
          });
        else if (!existing.fallback && match[2]) existing.fallback = match[2].trim();
      }
      for (const match of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
        const selector = (match[1] ?? '').trim();
        const body = match[2] ?? '';
        const declarations = [...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)];
        const themeClass = /\.([a-z0-9]+-theme-[a-z0-9-]+)/i.exec(selector)?.[1];
        if (
          !themeClass ||
          declarations.length < 3 ||
          /[a-z-]+\s*:(?!\s*--)/i.test(
            body.replace(/--[a-z0-9-]+\s*:[^;]+;/gi, '').replace(/color-scheme\s*:[^;]+;/g, ''),
          )
        )
          continue;
        if (!presets.has(themeClass)) {
          presets.set(themeClass, {
            values: Object.fromEntries(declarations.map((d) => [d[1] ?? '', (d[2] ?? '').trim()])),
            file: rel,
            line: lineAt(match.index ?? 0),
          });
        } else {
          const preset = presets.get(themeClass);
          if (preset)
            for (const d of declarations) preset.values[d[1] ?? ''] ??= (d[2] ?? '').trim();
        }
      }
    }
    const stylesheet = Object.keys(manifest.exports ?? {}).find((key) => key.endsWith('.css'));
    const cssImport = stylesheet ? [`import '${manifest.name}${stylesheet.slice(1)}';`] : [];
    // Theming hooks only: properties read with a fallback, or set by a theme preset. Properties read
    // without a fallback are internal (set by scripts or third-party styles).
    const presetNames = new Set(
      [...presets.values()].flatMap((preset) => Object.keys(preset.values)),
    );
    const sorted = [...variables.entries()]
      .filter(([name, info]) => info.fallback !== undefined || presetNames.has(name))
      .sort(([a], [b]) => a.localeCompare(b));
    const firstVar = sorted[0]?.[1];
    out.set('CSS variables', {
      schema: {
        name: 'CSS variables',
        kind: 'setting-group',
        imports: cssImport,
        options: Object.fromEntries(
          sorted.map(([name, info]) => [
            name,
            {
              type: { name: 'css', description: 'CSS value' },
              ...(info.fallback !== undefined ? { default: info.fallback } : {}),
            },
          ]),
        ),
        usedBy: [],
        filename: firstVar?.file ?? '',
        sourceUrl: sourceUrl(firstVar?.file ?? '', firstVar?.line),
      },
      strings: {
        symbolDescription:
          'Every custom property the stylesheet reads, with its fallback value. Set them on the viewer or any ancestor.',
        optionDescriptions: {},
      },
    });
    for (const [themeClass, preset] of presets) {
      out.set(themeClass, {
        schema: {
          name: themeClass,
          kind: 'setting-group',
          imports: cssImport,
          options: Object.fromEntries(
            Object.entries(preset.values)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([name, value]) => [
                name,
                { type: { name: 'css', description: 'CSS value' }, default: value },
              ]),
          ),
          usedBy: [],
          filename: preset.file,
          sourceUrl: sourceUrl(preset.file, preset.line),
        },
        strings: {
          symbolDescription: `Values applied by the <code>${themeClass}</code> class.`,
          optionDescriptions: {},
        },
      });
    }
  }

  // ── usedBy: invert capability frontmatter `symbols` (§8.3) ───────────────
  for (const page of model.pages.filter((p) => p.sourceFile)) {
    const path = join(options.contentRoot, page.sourceFile ?? '');
    if (!existsSync(path)) continue;
    const symbols = parseDoc(readFileSync(path, 'utf8')).frontmatter['symbols'];
    if (!Array.isArray(symbols)) continue;
    for (const symbol of symbols as string[]) out.get(symbol)?.schema.usedBy?.push(page.pathname);
  }
  return out;
}

const checksum = (text: string) => createHash('sha256').update(text).digest('hex');

/** Merges prose: existing values always win; only missing keys are added (P6). */
function mergeStrings(
  existing: ReferenceStrings & Record<string, unknown>,
  fresh: ReferenceStrings,
): { merged: ReferenceStrings; added: number } {
  let added = 0;
  const merged: Record<string, unknown> = { ...existing };
  if (existing.symbolDescription === undefined && fresh.symbolDescription) {
    merged['symbolDescription'] = fresh.symbolDescription;
    added++;
  }
  for (const key of ['optionDescriptions', 'eventDescriptions', 'classDescriptions'] as const) {
    const source = fresh[key] as Record<string, unknown> | undefined;
    if (!source) continue;
    const target = { ...((existing[key] as Record<string, unknown> | undefined) ?? {}) };
    for (const [name, value] of Object.entries(source)) {
      if (!(name in target) && value !== '' && value !== undefined) {
        target[name] = value;
        added++;
      }
    }
    if (Object.keys(target).length) merged[key] = target;
  }
  return { merged: merged as ReferenceStrings, added };
}

export async function runReference(options: ReferenceOptions): Promise<number> {
  const generated = await generateReference(options);
  const dir = join(options.contentRoot, 'reference');
  const expected = new Map<string, string>();
  for (const { schema } of generated.values())
    expected.set(`${symbolSlug(schema.name)}.schema.json`, stable(schema));
  const checksums = Object.fromEntries(
    [...expected]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, text]) => [file, checksum(text)]),
  );

  if (options.check) {
    const problems: string[] = [];
    const actualFiles = existsSync(dir)
      ? readdirSync(dir).filter((f) => f.endsWith('.schema.json'))
      : [];
    for (const [file, text] of expected) {
      const path = join(dir, file);
      if (!existsSync(path)) problems.push(`${file}: missing`);
      else if (readFileSync(path, 'utf8') !== text)
        problems.push(`${file}: differs from the source`);
    }
    for (const file of actualFiles)
      if (!expected.has(file)) problems.push(`${file}: no longer generated (stale)`);
    let missingProse = 0;
    for (const { schema, strings } of generated.values()) {
      const path = join(dir, `${symbolSlug(schema.name)}.strings.json`);
      const current = existsSync(path)
        ? (JSON.parse(readFileSync(path, 'utf8')) as ReferenceStrings & Record<string, unknown>)
        : {};
      missingProse += mergeStrings(current, strings).added;
      for (const name of Object.keys(schema.options ?? {}))
        if (!current.optionDescriptions?.[name]) missingProse += 0;
    }
    if (missingProse)
      console.warn(
        `warning: ${missingProse} prose keys missing from strings files (run the generator to add skeletons)`,
      );
    if (problems.length) {
      console.error(problems.join('\n'));
      return 1;
    }
    console.log(`reference up to date: ${expected.size} symbols`);
    return 0;
  }

  mkdirSync(dir, { recursive: true });
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.schema.json'))) {
    if (!expected.has(file)) {
      rmSync(join(dir, file));
      console.warn(`removed stale ${file} (its strings file is kept)`);
    }
  }
  let added = 0;
  for (const { schema, strings } of generated.values()) {
    const slug = symbolSlug(schema.name);
    writeFileSync(join(dir, `${slug}.schema.json`), stable(schema));
    const stringsPath = join(dir, `${slug}.strings.json`);
    const current = existsSync(stringsPath)
      ? (JSON.parse(readFileSync(stringsPath, 'utf8')) as ReferenceStrings &
          Record<string, unknown>)
      : {};
    const result = mergeStrings(current, strings);
    added += result.added;
    writeFileSync(stringsPath, stable(result.merged));
  }
  writeFileSync(join(dir, '.checksums.json'), stable(checksums));
  console.log(
    `generated ${expected.size} reference symbols; ${added} prose keys added to strings files`,
  );
  return 0;
}
