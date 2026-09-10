import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined;
  }
  let query: MediaQueryList | null = null;
  const listen = () => {
    query?.removeEventListener('change', handleChange);
    query = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    query.addEventListener('change', handleChange);
  };
  const handleChange = () => {
    // The query only matches the old ratio; re-arm for the new one.
    listen();
    onChange();
  };
  listen();
  return () => query?.removeEventListener('change', handleChange);
}

const getSnapshot = () => window.devicePixelRatio || 1;
const getServerSnapshot = () => 1;

/** Current `devicePixelRatio`, updated when the window moves between screens or zooms. */
export function useDevicePixelRatio(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
