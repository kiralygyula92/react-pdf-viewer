import { useMemo, useSyncExternalStore, type AnchorHTMLAttributes } from 'react';

/** A parsed hash route: `#/view?src=…` → `{ path: '/view', params }`. */
export interface Route {
  path: string;
  params: URLSearchParams;
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const index = raw.indexOf('?');
  return {
    path: index === -1 ? raw : raw.slice(0, index),
    params: new URLSearchParams(index === -1 ? '' : raw.slice(index + 1)),
  };
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** The current hash route. Hash routing keeps the static build working from any sub-path. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  );
  return useMemo(() => parseHash(hash), [hash]);
}

export function href(path: string, params: Record<string, string | undefined> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const query = search.toString();
  return `#${path}${query ? `?${query}` : ''}`;
}

/** Updates the address bar without adding a history entry. */
export function replaceRoute(path: string, params: Record<string, string | undefined>) {
  const next = href(path, params);
  if (next !== window.location.hash) {
    window.history.replaceState(window.history.state, '', next);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

export function Link({
  to,
  current,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; current?: boolean }) {
  return (
    <a href={`#${to}`} aria-current={current ? 'page' : undefined} {...props}>
      {children}
    </a>
  );
}
