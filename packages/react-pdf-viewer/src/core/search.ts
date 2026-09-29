/** A text item as returned by `getTextContent()` (marked-content entries have no `str`). */
export interface TextItemLike {
  str: string;
  hasEOL?: boolean;
}

/** Text of one page prepared for searching. Offsets stay aligned with the text layer's items. */
export interface PageText {
  /** All items joined; an end-of-line item is followed by a space. */
  text: string;
  /** Lower-cased `text` with identical offsets (falls back to `text` if lower-casing changes length). */
  folded: string;
  /** Start offset of each item within `text`. */
  offsets: number[];
  /** Text of each item, in text-layer order. */
  items: string[];
}

/** A match within a page's `text`. */
export interface TextRange {
  start: number;
  end: number;
}

/** The part of one text item covered by a match. */
export interface ItemSegment {
  item: number;
  start: number;
  end: number;
}

/** Keeps only real text items (the entries the text layer renders as spans). */
export function isTextItem<T>(item: T): item is T & TextItemLike {
  return (
    typeof item === 'object' && item !== null && typeof (item as { str?: unknown }).str === 'string'
  );
}

function fold(value: string): string {
  const lower = value.toLowerCase();
  return lower.length === value.length ? lower : value;
}

export function buildPageText(items: readonly TextItemLike[]): PageText {
  const offsets: number[] = [];
  const strings: string[] = [];
  let text = '';
  for (const item of items) {
    offsets.push(text.length);
    strings.push(item.str);
    text += item.str;
    if (item.hasEOL) text += ' ';
  }
  return { text, folded: fold(text), offsets, items: strings };
}

/** Normalizes a query: trimmed, whitespace collapsed, lower-cased. */
export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Non-overlapping, case-insensitive matches of `query` in a page. */
export function findMatches(page: PageText, query: string): TextRange[] {
  const needle = normalizeQuery(query);
  if (!needle) return [];
  const matches: TextRange[] = [];
  let from = 0;
  for (;;) {
    const index = page.folded.indexOf(needle, from);
    if (index === -1) break;
    matches.push({ start: index, end: index + needle.length });
    from = index + needle.length;
  }
  return matches;
}

/** Splits a page-level range into the per-item pieces the text layer can highlight. */
export function toItemSegments(page: PageText, range: TextRange): ItemSegment[] {
  const segments: ItemSegment[] = [];
  page.items.forEach((item, index) => {
    const itemStart = page.offsets[index] ?? 0;
    const start = Math.max(range.start, itemStart) - itemStart;
    const end = Math.min(range.end, itemStart + item.length) - itemStart;
    if (end > start) segments.push({ item: index, start, end });
  });
  return segments;
}
