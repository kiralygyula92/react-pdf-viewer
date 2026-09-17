/**
 * MDX `table` override: wraps Markdown tables in a keyboard-focusable scroll region, so wide
 * tables scroll horizontally on narrow screens without trapping keyboard users (axe
 * `scrollable-region-focusable`). Pass as `components={{ table: ScrollTable }}`.
 */
import type { TableHTMLAttributes } from 'react';

export function ScrollTable({
  label,
  ...props
}: TableHTMLAttributes<HTMLTableElement> & { label?: string }) {
  return (
    <div className="ppds-table-scroll" role="region" tabIndex={0} aria-label={label ?? 'Table'}>
      <table {...props} />
    </div>
  );
}
