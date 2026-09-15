import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

/** Accessible tabs (WAI-ARIA tabs pattern, automatic activation). */
export function Tabs({
  tabs,
  selected,
  onSelect,
  label,
}: {
  tabs: Tab[];
  selected: string;
  onSelect: (id: string) => void;
  label: string;
}) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = tabs.findIndex((tab) => tab.id === selected);
    const move: Record<string, number> = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = move[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const tab = tabs[next];
    if (!tab) return;
    onSelect(tab.id);
    listRef.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(`${baseId}-tab-${tab.id}`)}`)
      ?.focus();
  };

  return (
    <div className="demo-tabs">
      <div ref={listRef} role="tablist" aria-label={label} className="demo-tabs__list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`${baseId}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.id === selected}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={tab.id === selected ? 0 : -1}
            className="demo-tabs__tab"
            onClick={() => onSelect(tab.id)}
            onKeyDown={handleKeyDown}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== selected}
          className="demo-tabs__panel"
        >
          {tab.id === selected && tab.content}
        </div>
      ))}
    </div>
  );
}
