import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  SITE_ORIGIN_TOKEN,
  codeFence,
  parseDoc,
  toMarkdownTwin,
  type TwinDemo,
} from './markdown.ts';
import { contentPages, loadPluginModel, twinPath } from './model.ts';
import {
  loadReference,
  referenceBody,
  referenceIndexBody,
  referenceIndexMarkdown,
  referenceMarkdown,
  symbolDescription,
} from './reference/render.ts';
import { absoluteUrl, llmsTxt } from './surfaces.ts';

/**
 * The whole documentation in one file, written twice with the same bytes: `llms-full.md` is what
 * a person downloads and keeps, `llms-full.txt` the name tools look for by convention.
 */
export const LLMS_FULL_FILES = ['llms-full.md', 'llms-full.txt'] as const;

const API_DESCRIPTION = 'Generated reference for every public component, hook, function and type.';

export interface MachineSurfaceOptions {
  contentRoot: string;
  /** Canonical origin for the absolute URLs in the files; also replaces `%SITE_ORIGIN%`. */
  origin: string;
  /** The documented package, named in the header of the full file. */
  package?: { name: string; peerDependencies?: Record<string, string> | undefined } | undefined;
  /** Paragraphs for the header of the full file, such as what the examples rely on. */
  notes?: string[] | undefined;
}

/** Demo files (`demo-*.tsx`) under the content root, as demo ids (`features/zoom/demo-basics`). */
function demoIds(contentRoot: string): string[] {
  const ids: string[] = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) visit(path);
      else if (/^demo-.+\.(tsx|ts|jsx)$/.test(name))
        ids.push(
          relative(contentRoot, path)
            .replace(/\\/g, '/')
            .replace(/\.[a-z]+$/, ''),
        );
    }
  };
  visit(contentRoot);
  return ids.sort();
}

/**
 * The machine surface (PPDS §7.7), keyed by site pathname: a Markdown twin for every docs page and
 * reference entry, `llms.txt`, and the full documentation (`llms-full.md` and `llms-full.txt`):
 * every page in reading order, the API reference included, with the source of each live example
 * inlined where its page shows it. It comes from the same content in the same pass as the twins,
 * so it cannot say anything the site does not.
 */
export function machineSurface(options: MachineSurfaceOptions): Map<string, string> {
  const { contentRoot, origin } = options;
  const model = loadPluginModel(contentRoot);
  const { config } = model;
  const prefix = `/${config.id}/`;
  const reference = loadReference(contentRoot);
  const files = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const absolute = (href: string) => absoluteUrl(origin, href);
  const symbolPath = (name: string) => `${prefix}api/${reference.slugOf(name)}/`;
  const demoSource = (id: string) => {
    for (const ext of ['tsx', 'ts', 'jsx', 'css']) {
      const path = join(contentRoot, `${id}.${ext}`);
      if (existsSync(path)) return { code: readFileSync(path, 'utf8'), lang: ext };
    }
    return undefined;
  };

  // The full file: one section per page, each example in full the first time it is shown.
  const sections: string[] = [];
  const shown = new Map<string, string>(); // demo id → title of the page that first showed it
  const addSection = (
    title: string,
    description: string,
    sectionTitle: string,
    pathname: string,
    body: string,
  ) => {
    sections.push(
      [
        `# ${title}`,
        '',
        `> ${description.replace(/\s*\n\s*/g, ' ')}`,
        '',
        `${sectionTitle} · ${absolute(pathname)}`,
        '',
        body.trim(),
      ].join('\n'),
    );
  };

  for (const page of contentPages(model)) {
    if (page.pathname === `${prefix}api/`) {
      descriptions.set(page.pathname, API_DESCRIPTION);
      files.set(twinPath(page.pathname), referenceIndexMarkdown(model, reference, origin));
      addSection(
        page.title,
        API_DESCRIPTION,
        page.sectionTitle,
        page.pathname,
        referenceIndexBody(model, reference, origin),
      );
      // Then every symbol, in sidebar order.
      const entries = [...reference.symbols.values()].sort((a, b) =>
        a.schema.name.localeCompare(b.schema.name),
      );
      for (const entry of entries) {
        addSection(
          `${entry.schema.name} reference`,
          symbolDescription(entry),
          page.sectionTitle,
          symbolPath(entry.schema.name),
          referenceBody(entry, model, origin, 2),
        );
      }
      continue;
    }
    if (!page.sourceFile) continue;
    const source = readFileSync(join(contentRoot, page.sourceFile), 'utf8').replaceAll(
      SITE_ORIGIN_TOKEN,
      origin,
    );
    const { frontmatter, body } = parseDoc(source);
    const description = String(frontmatter['description'] ?? '');
    descriptions.set(page.pathname, description);
    const heading = page.archetype === 'A' ? `${config.name} — Overview` : page.title;
    const symbols = Array.isArray(frontmatter['symbols'])
      ? (frontmatter['symbols'] as string[])
      : [];

    let twin = `# ${heading}\n\n${description}\n\n${toMarkdownTwin(body, { demoSource, absolute })}`;
    if (page.archetype === 'B') {
      twin += `\n## API\n\n${
        symbols.length
          ? symbols
              .map((symbol) => `- [${symbol}](${absolute(twinPath(symbolPath(symbol)))})`)
              .join('\n')
          : 'This capability has no public symbols of its own.'
      }\n`;
      for (const symbol of symbols) {
        const entry = reference.symbols.get(symbol);
        if (entry) twin += `\n---\n\n${referenceMarkdown(entry, reference, model, origin, 2)}`;
      }
    }
    files.set(twinPath(page.pathname), twin);

    // On the site a demo is a live viewer; in a text file the useful part is its code.
    const renderDemo = ({ id, title, code, lang }: TwinDemo) => {
      const name = title ?? id;
      const first = shown.get(id);
      if (first !== undefined) return `*Example: ${name}* — the same source as under "${first}".`;
      shown.set(id, page.title);
      return `*Example: ${name}* — the source of the live demo on this page.\n\n${codeFence(lang, code)}`;
    };
    let full = toMarkdownTwin(body, { demoSource, absolute, renderDemo });
    if (page.archetype === 'B') {
      full += `\n## API\n\n${
        symbols.length
          ? symbols.map((symbol) => `- [${symbol}](${absolute(symbolPath(symbol))})`).join('\n')
          : 'This capability has no public symbols of its own.'
      }\n`;
    }
    addSection(page.title, description, page.sectionTitle, page.pathname, full);
  }

  for (const entry of reference.symbols.values()) {
    files.set(
      twinPath(symbolPath(entry.schema.name)),
      referenceMarkdown(entry, reference, model, origin, 1),
    );
  }

  // Every example is on a page today; one added without a page still belongs in the file.
  const unplaced = demoIds(contentRoot).filter((id) => !shown.has(id));
  if (unplaced.length > 0) {
    const blocks = unplaced.map((id) => {
      const demo = demoSource(id);
      return `## ${id}\n\n${demo ? codeFence(demo.lang, demo.code.trimEnd()) : ''}`;
    });
    sections.push(['# Examples not shown on any page', '', ...blocks].join('\n\n'));
  }

  const llms = absolute(`${prefix}llms.txt`);
  const full = absolute(`${prefix}${LLMS_FULL_FILES[0]}`);
  files.set(
    `${prefix}llms.txt`,
    llmsTxt(
      model,
      origin,
      descriptions,
      [...reference.symbols.values()].map((entry) => ({
        title: `${entry.schema.name} reference`,
        pathname: symbolPath(entry.schema.name),
        description: entry.strings.symbolDescription ?? '',
        section: 'API reference',
      })),
      [
        `The whole documentation in one file, with the source of every example: [${LLMS_FULL_FILES[0]}](${full}).`,
      ],
    ),
  );

  const pkg = options.package;
  const peers = Object.entries(pkg?.peerDependencies ?? {})
    .map(([name, range]) => `\`${name}\` ${range}`)
    .join(', ');
  const pageCount = sections.length - (unplaced.length > 0 ? 1 : 0);
  const header = [
    `# ${config.name} — the complete documentation`,
    '',
    `> ${config.tagline}`,
    '',
    config.description,
    '',
    `Every page of the documentation at ${absolute(prefix)}, in reading order, with the source ` +
      'of every live example inlined where its page shows it. It is generated from the same ' +
      'Markdown as the site, so it says exactly what the site says.',
    '',
    ...(pkg
      ? [
          `- Package: \`${pkg.name}\`, documented at version ${config.currentVersion}.${
            peers ? ` Peer dependencies: ${peers}, and nothing else.` : ''
          }`,
        ]
      : []),
    `- Page index: ${llms} — and any single page as Markdown, at its URL with \`.md\`.`,
    `- ${pageCount} pages, ${shown.size + unplaced.length} examples.`,
    ...(options.notes ?? []).flatMap((note) => ['', note]),
    '',
    ...sections.flatMap((section) => ['---', '', section, '']),
  ]
    .join('\n')
    .trimEnd();
  for (const name of LLMS_FULL_FILES) files.set(`${prefix}${name}`, `${header}\n`);

  return files;
}
