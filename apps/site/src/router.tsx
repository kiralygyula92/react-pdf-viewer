import { useMemo, useSyncExternalStore } from 'react';

const NAVIGATE = 'demo:navigate';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE, onChange);
  };
}

/** The current query parameters. Islands render only in the browser (`client:only`). */
export function useRoute(): { params: URLSearchParams } {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => '',
  );
  return useMemo(() => ({ params: new URLSearchParams(search) }), [search]);
}

/** Replaces the query string of the current page without adding a history entry. */
export function replaceQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const query = search.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ''}`;
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(window.history.state, '', next);
    window.dispatchEvent(new Event(NAVIGATE));
  }
}
