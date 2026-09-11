import { useEffect, useMemo, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  buildPageText,
  findMatches,
  isTextItem,
  normalizeQuery,
  type PageText,
} from '../core/search.js';

/** One search hit: its page and its index among that page's matches. */
export interface SearchMatch {
  page: number;
  index: number;
}

interface SearchState {
  document: PDFDocumentProxy | null;
  query: string;
  matches: SearchMatch[];
  done: boolean;
}

const DEBOUNCE_MS = 200;

/** Loads (and caches) the searchable text of one page. */
export async function loadPageText(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  cache: Map<number, Promise<PageText>>,
): Promise<PageText> {
  let text = cache.get(pageNumber);
  if (!text) {
    text = pdf
      .getPage(pageNumber)
      .then((page) => page.getTextContent())
      .then((content) => buildPageText(content.items.filter(isTextItem)));
    cache.set(pageNumber, text);
  }
  return text;
}

/**
 * Finds every match of `query` in the document, page by page (debounced; results stream in).
 */
export function useDocumentSearch(
  pdf: PDFDocumentProxy | null,
  query: string,
): { matches: SearchMatch[]; searching: boolean } {
  const normalized = normalizeQuery(query);
  const cache = useMemo(() => {
    void pdf;
    return new Map<number, Promise<PageText>>();
  }, [pdf]);
  const [state, setState] = useState<SearchState>({
    document: null,
    query: '',
    matches: [],
    done: true,
  });

  useEffect(() => {
    if (!pdf || !normalized) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const matches: SearchMatch[] = [];
        for (let page = 1; page <= pdf.numPages; page++) {
          const text = await loadPageText(pdf, page, cache).catch(() => null);
          if (cancelled) return;
          if (text) {
            findMatches(text, normalized).forEach((_, index) => matches.push({ page, index }));
          }
          if (page % 8 === 0 || page === pdf.numPages) {
            setState({
              document: pdf,
              query: normalized,
              matches: [...matches],
              done: page === pdf.numPages,
            });
          }
        }
      })();
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pdf, normalized, cache]);

  const current = state.document === pdf && state.query === normalized;
  return {
    matches: current && normalized ? state.matches : [],
    searching: Boolean(normalized) && (!current || !state.done),
  };
}
