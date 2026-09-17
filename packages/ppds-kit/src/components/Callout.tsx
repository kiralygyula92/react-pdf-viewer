/** `:::info` / `:::warning` callout (PPDS §6 B, J). Anti-patterns pass `wrong` code in the slot. */
import type { ReactNode } from 'react';

export interface CalloutProps {
  type?: 'info' | 'warning';
  title?: string;
  children?: ReactNode;
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  return (
    <aside className={`ppds-callout ppds-callout--${type}`} role="note">
      <p className="ppds-callout__title">{title ?? (type === 'warning' ? 'Warning' : 'Note')}</p>
      <div className="ppds-callout__body">{children}</div>
    </aside>
  );
}
