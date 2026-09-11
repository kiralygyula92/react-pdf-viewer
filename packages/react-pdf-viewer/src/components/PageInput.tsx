import { useState } from 'react';
import type { LabelContext } from '../labels.js';

interface PageInputProps {
  page: number;
  numPages: number;
  label: string;
  context: LabelContext;
  onCommit: (page: number) => void;
}

/** Editable page number (`Enter` or blur commits, `Esc` reverts) followed by the page count. */
export function PageInput({ page, numPages, label, context, onCommit }: PageInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const value = Number.parseInt(draft, 10);
    setDraft(null);
    if (Number.isFinite(value)) onCommit(value);
  };

  return (
    <>
      <input
        className="rpv-page-input"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        size={Math.max(2, String(numPages).length)}
        disabled={numPages === 0}
        value={draft ?? (numPages > 0 ? context.formatNumber(page) : '0')}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            setDraft(null);
          }
        }}
      />
      <span aria-hidden="true">/ {context.formatNumber(numPages)}</span>
    </>
  );
}
