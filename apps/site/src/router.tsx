import { useMemo, useSyncExternalStore } from 'react';

/** Logical demo routes and their permanent site paths (content/react-pdf-viewer/nav.json). */
export const ROUTES = {
  playground: '/react-pdf-viewer/demos/playground/',
  /** URL-driven full-page viewer for the e2e suites (EXCEPTIONS E-03). */
  view: '/_internal/viewer/',
  harness: '/_internal/harness/',
} as const;

export type RouteName = keyof typeof ROUTES;

export interface Route {
  path: string;
  params: URLSearchParams;
}

const NAVIGATE = 'demo:navigate';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE, onChange);
  };
}

/** The current path and query. Islands render only in the browser (`client:only`). */
export function useRoute(): Route {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => '',
  );
  const path = useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => '',
  );
  return useMemo(() => ({ path, params: new URLSearchParams(search) }), [path, search]);
}

export function href(route: RouteName, params: Record<string, string | undefined> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const query = search.toString();
  return `${ROUTES[route]}${query ? `?${query}` : ''}`;
}

/** Updates the address bar without adding a history entry. */
export function replaceRoute(route: RouteName, params: Record<string, string | undefined>) {
  const next = href(route, params);
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(window.history.state, '', next);
    window.dispatchEvent(new Event(NAVIGATE));
  }
}
