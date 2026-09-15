import { useCallback, useState } from 'react';

interface LogEntry {
  id: number;
  time: string;
  name: string;
  payload: string;
}

let nextId = 1;

/** Event log state: `log(name, payload)` appends a timestamped entry. */
export function useEventLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const log = useCallback((name: string, payload?: unknown) => {
    const time = new Date().toISOString().slice(11, 23);
    const text = payload === undefined ? '' : JSON.stringify(payload);
    setEntries((current) =>
      [{ id: nextId++, time, name, payload: text }, ...current].slice(0, 200),
    );
  }, []);
  const clear = useCallback(() => setEntries([]), []);
  return { entries, log, clear };
}

export function EventLog({ entries, onClear }: { entries: LogEntry[]; onClear: () => void }) {
  return (
    <details className="demo-log" open>
      <summary>
        Event log <span className="demo-badge">{entries.length}</span>
      </summary>
      <div className="demo-log__actions">
        <button type="button" className="demo-button" onClick={onClear}>
          Clear
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="demo-hint">Interact with the viewer to see its callbacks.</p>
      ) : (
        <div className="demo-log__list" role="region" aria-label="Viewer events" tabIndex={0}>
          <ol>
            {entries.map((entry) => (
              <li key={entry.id} data-event={entry.name}>
                <time>{entry.time}</time> <strong>{entry.name}</strong> <code>{entry.payload}</code>
              </li>
            ))}
          </ol>
        </div>
      )}
    </details>
  );
}
