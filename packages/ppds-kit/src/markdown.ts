import { parse as parseYaml } from 'yaml';

export interface ParsedDoc {
  frontmatter: Record<string, unknown>;
  body: string;
}

/** Splits YAML frontmatter from a Markdown/MDX document. */
export function parseDoc(source: string): ParsedDoc {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { frontmatter: {}, body: source };
  const frontmatter = (parseYaml(match[1] ?? '') ?? {}) as Record<string, unknown>;
  return { frontmatter, body: source.slice(match[0].length) };
}

export interface Heading {
  depth: number;
  text: string;
  slug: string;
}

/** GitHub-style heading slug, matching the ids the Markdown pipeline generates. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

/** ATX headings outside fenced code blocks. */
export function headingsOf(body: string): Heading[] {
  const headings: Heading[] = [];
  let fence: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    const fenceMatch = /^(```+|~~~+)/.exec(line.trim());
    if (fenceMatch) {
      const marker = fenceMatch[1] ?? '';
      if (fence === null) fence = marker[0] ?? null;
      else if (marker[0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      const text = (match[2] ?? '').replace(/`/g, '');
      headings.push({ depth: (match[1] ?? '').length, text, slug: slugify(text) });
    }
  }
  return headings;
}

/** Words of prose, excluding code blocks, JSX tags and frontmatter. */
export function wordCount(body: string): number {
  const prose = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#>*_`|[\]()-]/g, ' ');
  return prose.split(/\s+/).filter((word) => /\p{L}/u.test(word)).length;
}

/**
 * `%SITE_ORIGIN%` in a page becomes the site origin, for the few places prose needs an absolute
 * URL (a `curl` command, say). Not `{origin}`: braces are JSX in MDX and in every code sample.
 */
export const SITE_ORIGIN_TOKEN = '%SITE_ORIGIN%';

/** A demo inlined into Markdown: its id, the title the page gives it, and its source. */
export interface TwinDemo {
  id: string;
  title: string | undefined;
  code: string;
  lang: string;
}

export interface TwinOptions {
  /** Resolves `<Demo id="…" />` to its source code and language. */
  demoSource: (id: string) => { code: string; lang: string } | undefined;
  /** Absolute URL for site-relative links. */
  absolute: (href: string) => string;
  /** Renders an inlined demo; by default its title in bold, then its fenced source. */
  renderDemo?: ((demo: TwinDemo) => string) | undefined;
}

/** A fenced code block whose fence is longer than any backtick run in the code. */
export function codeFence(lang: string, code: string): string {
  const longest = Math.max(0, ...[...code.matchAll(/`+/g)].map((match) => match[0].length));
  const ticks = '`'.repeat(Math.max(3, longest + 1));
  return `${ticks}${lang}\n${code}\n${ticks}`;
}

const defaultDemo = ({ title, code, lang }: TwinDemo) =>
  `${title ? `**Demo: ${title}**\n\n` : ''}${codeFence(lang, code)}`;

/**
 * Converts an authored MDX page body to plain Markdown for its `.md` twin: imports
 * are dropped, demos become fenced source, callouts become blockquotes, other components are
 * unwrapped, and site-relative links become absolute. Code is never touched: fenced blocks and
 * inline code are set aside while the prose is converted, then put back as they were.
 */
export function toMarkdownTwin(body: string, options: TwinOptions): string {
  const kept: string[] = [];
  const keepBlock = (text: string) => `\uE000B${kept.push(text) - 1}\uE000`;
  const keepInline = (text: string) => `\uE000I${kept.push(text) - 1}\uE000`;

  const lines: string[] = [];
  let fence: string | null = null;
  let block: string[] = [];
  for (const line of body.split('\n')) {
    const marker = /^(```+|~~~+)/.exec(line.trim())?.[1];
    if (fence === null) {
      if (marker) {
        fence = marker;
        block = [line];
      } else lines.push(line);
      continue;
    }
    block.push(line);
    if (
      marker !== undefined &&
      marker[0] === fence[0] &&
      marker.length >= fence.length &&
      line.trim() === marker
    ) {
      lines.push(keepBlock(block.join('\n')));
      fence = null;
    }
  }
  if (fence !== null) lines.push(...block);

  let out = lines.join('\n').replace(/``[^\n]+?``|`[^`\n]+`/g, keepInline);
  out = out.replace(/^import\s.+?;?\s*$/gm, '');
  const renderDemo = options.renderDemo ?? defaultDemo;
  out = out.replace(/<Demo\b([^>]*?)\/>/g, (_all, attrs: string) => {
    const id = /id="([^"]+)"/.exec(attrs)?.[1];
    const title = /title="([^"]+)"/.exec(attrs)?.[1];
    const demo = id ? options.demoSource(id) : undefined;
    if (!id || !demo) return '';
    return keepBlock(renderDemo({ id, title, code: demo.code.trimEnd(), lang: demo.lang }));
  });
  out = out.replace(
    /<Callout\b([^>]*)>([\s\S]*?)<\/Callout>/g,
    (_all, attrs: string, inner: string) => {
      const label = /type="warning"/.test(attrs) ? 'Warning' : 'Note';
      const title = /title="([^"]+)"/.exec(attrs)?.[1];
      const content = inner.trim().split('\n');
      const quoted = title
        ? [`**${label}: ${title}**`, '', ...content]
        : [`**${label}:** ${content[0] ?? ''}`, ...content.slice(1)];
      return quoted.map((line) => (line ? `> ${line}` : '>')).join('\n');
    },
  );
  out = out.replace(/<\/?[A-Z][A-Za-z]*\b[^>]*>/g, '');
  out = out.replace(/\]\((\/[^)\s]*)\)/g, (_all, href: string) => `](${options.absolute(href)})`);
  out = out.replace(/\n{3,}/g, '\n\n');

  // Blocks inside a blockquote (a callout) keep the quote marker on every line.
  out = out.replace(/^(.*?)\uE000B(\d+)\uE000/gm, (_all, before: string, index: string) => {
    const text = kept[Number(index)] ?? '';
    const quote = /^(?:> ?)+$/.exec(before)?.[0];
    return before + (quote ? text.split('\n').join(`\n${quote}`) : text);
  });
  out = out.replace(/\uE000[BI](\d+)\uE000/g, (_all, index: string) => kept[Number(index)] ?? '');
  return `${out.trim()}\n`;
}
