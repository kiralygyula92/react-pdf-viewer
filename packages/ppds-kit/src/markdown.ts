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

export interface TwinOptions {
  /** Resolves `<Demo id="…" />` to its source code and language. */
  demoSource: (id: string) => { code: string; lang: string } | undefined;
  /** Absolute URL for site-relative links. */
  absolute: (href: string) => string;
}

/**
 * Converts an authored MDX page body to plain Markdown for its `.md` twin (PPDS §7.7): imports
 * are dropped, demos become fenced source, callouts become blockquotes, other components are
 * unwrapped, and site-relative links become absolute.
 */
export function toMarkdownTwin(body: string, options: TwinOptions): string {
  let out = body.replace(/^import\s.+?;?\s*$/gm, '');
  out = out.replace(/<Demo\b([^>]*?)\/>/g, (_all, attrs: string) => {
    const id = /id="([^"]+)"/.exec(attrs)?.[1];
    const title = /title="([^"]+)"/.exec(attrs)?.[1];
    const demo = id ? options.demoSource(id) : undefined;
    if (!demo) return '';
    return `${title ? `**Demo: ${title}**\n\n` : ''}\`\`\`${demo.lang}\n${demo.code.trimEnd()}\n\`\`\``;
  });
  out = out.replace(
    /<Callout\b[^>]*type="(info|warning)"[^>]*>([\s\S]*?)<\/Callout>/g,
    (_all, type: string, inner: string) =>
      inner
        .trim()
        .split('\n')
        .map(
          (line, index) =>
            `> ${index === 0 ? `**${type === 'warning' ? 'Warning' : 'Note'}:** ` : ''}${line}`,
        )
        .join('\n'),
  );
  out = out.replace(/<\/?[A-Z][A-Za-z]*\b[^>]*>/g, '');
  out = out.replace(/\]\((\/[^)\s]*)\)/g, (_all, href: string) => `](${options.absolute(href)})`);
  return `${out.replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
