import { useMemo } from 'react';

/** Helpers passed to label functions. */
export interface LabelContext {
  /** Formats an integer for the viewer's `locale` (no grouping separators). */
  formatNumber: (value: number) => string;
}

/**
 * Every user-visible string and accessible name. Defaults are English; override any subset
 * through the `labels` prop.
 */
export interface PdfViewerLabels {
  /** Accessible name of the viewer region. */
  viewer: string;
  /** Accessible name of the toolbar. */
  toolbar: string;
  /** Accessible name of the scrollable document area. */
  document: string;
  zoomOut: string;
  zoomIn: string;
  /** Zoom label text, e.g. `100%`. */
  zoomLevel: (percent: number, context: LabelContext) => string;
  /** Accessible name of the reset-zoom action. */
  resetZoom: string;
  previousPage: string;
  nextPage: string;
  /** Page label text, e.g. `1 / 3`. */
  pageIndicator: (page: number, total: number, context: LabelContext) => string;
  /** Accessible name of the page image, e.g. `Page 1 of 3`. */
  pageAriaLabel: (page: number, total: number, context: LabelContext) => string;
  /** Accessible name of the page-number input. */
  pageInput: string;
  enterFullscreen: string;
  exitFullscreen: string;
  rotate: string;
  download: string;
  print: string;
  /** Accessible name of the overflow menu button ("⋮") shown when the toolbar is too narrow. */
  moreActions: string;
  loading: string;
  retry: string;
  /** Announced when there is no document. */
  empty: string;
  /** Print preparation status, e.g. `Preparing document for printing… 3 / 40`. */
  printProgress: (done: number, total: number, context: LabelContext) => string;
  cancel: string;
  passwordPrompt: string;
  passwordLabel: string;
  passwordSubmit: string;
  passwordIncorrect: string;
  /** Accessible name of the thumbnails sidebar. */
  thumbnails: string;
  /** Accessible name of the search field. */
  search: string;
  /** Search result status, e.g. `2 of 5`. */
  searchResults: (current: number, total: number, context: LabelContext) => string;
  searchPrevious: string;
  searchNext: string;
  searchNoResults: string;
}

/** The English defaults. */
export const defaultLabels: PdfViewerLabels = {
  viewer: 'PDF viewer',
  toolbar: 'PDF controls',
  document: 'Document',
  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  zoomLevel: (percent, { formatNumber }) => `${formatNumber(percent)}%`,
  resetZoom: 'Reset zoom',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  pageIndicator: (page, total, { formatNumber }) =>
    `${formatNumber(page)} / ${formatNumber(total)}`,
  pageAriaLabel: (page, total, { formatNumber }) =>
    `Page ${formatNumber(page)} of ${formatNumber(total)}`,
  pageInput: 'Page number',
  enterFullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',
  rotate: 'Rotate PDF',
  download: 'Download PDF',
  print: 'Print PDF',
  moreActions: 'More actions',
  loading: 'Loading PDF...',
  retry: 'Retry',
  empty: 'No document',
  printProgress: (done, total, { formatNumber }) =>
    `Preparing document for printing… ${formatNumber(done)} / ${formatNumber(total)}`,
  cancel: 'Cancel',
  passwordPrompt: 'This document is password protected',
  passwordLabel: 'Password',
  passwordSubmit: 'Open',
  passwordIncorrect: 'Incorrect password. Please try again.',
  thumbnails: 'Pages',
  search: 'Search in document',
  searchResults: (current, total, { formatNumber }) =>
    `${formatNumber(current)} of ${formatNumber(total)}`,
  searchPrevious: 'Previous match',
  searchNext: 'Next match',
  searchNoResults: 'No matches',
};

function createNumberFormatter(locale: string | undefined): (value: number) => string {
  let format: Intl.NumberFormat;
  try {
    format = new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 0 });
  } catch {
    format = new Intl.NumberFormat(undefined, { useGrouping: false, maximumFractionDigits: 0 });
  }
  return (value) => format.format(value);
}

/** Label context for a locale (memoised). */
export function useLabelContext(locale: string | undefined): LabelContext {
  return useMemo(() => ({ formatNumber: createNumberFormatter(locale) }), [locale]);
}

/** Merges partial overrides onto the defaults (memoised on the overrides' identity). */
export function useLabels(overrides: Partial<PdfViewerLabels> | undefined): PdfViewerLabels {
  return useMemo(() => ({ ...defaultLabels, ...overrides }), [overrides]);
}
