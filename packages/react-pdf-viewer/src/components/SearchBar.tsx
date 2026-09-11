import type { KeyboardEvent, Ref } from 'react';
import type { LabelContext, PdfViewerLabels } from '../labels.js';
import { ExpandLessIcon, ExpandMoreIcon, SearchIcon } from './icons.js';

interface SearchBarProps {
  inputRef: Ref<HTMLInputElement>;
  query: string;
  onQueryChange: (query: string) => void;
  total: number;
  /** 0-based index of the current match. */
  current: number;
  searching: boolean;
  onNext: () => void;
  onPrevious: () => void;
  labels: PdfViewerLabels;
  context: LabelContext;
}

/** Find-in-document field: `Enter` / `Shift+Enter` step through matches, `Esc` clears. */
export function SearchBar({
  inputRef,
  query,
  onQueryChange,
  total,
  current,
  searching,
  onNext,
  onPrevious,
  labels,
  context,
}: SearchBarProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) onPrevious();
      else onNext();
    } else if (event.key === 'Escape' && query) {
      event.preventDefault();
      event.stopPropagation();
      onQueryChange('');
    }
  };

  const status = !query.trim()
    ? ''
    : total > 0
      ? labels.searchResults(current + 1, total, context)
      : searching
        ? '…'
        : labels.searchNoResults;

  return (
    <div className="rpv-search">
      <span className="rpv-search__icon" aria-hidden="true">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        className="rpv-search__input"
        type="search"
        aria-label={labels.search}
        placeholder={labels.search}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <output className="rpv-search__status" aria-live="polite">
        {status}
      </output>
      <button
        type="button"
        className="rpv-button"
        aria-label={labels.searchPrevious}
        disabled={total === 0}
        onClick={onPrevious}
      >
        <ExpandLessIcon />
      </button>
      <button
        type="button"
        className="rpv-button"
        aria-label={labels.searchNext}
        disabled={total === 0}
        onClick={onNext}
      >
        <ExpandMoreIcon />
      </button>
    </div>
  );
}
