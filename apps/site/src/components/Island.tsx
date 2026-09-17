/**
 * Placeholder for a browser-only component (PPDS §7.8: the page works without it). The client
 * entry finds these and mounts the matching component; nothing is rendered on the server, exactly
 * as the demos behave today.
 */
export type IslandName = 'demo' | 'scenario';

export function Island({ name, props }: { name: IslandName; props: Record<string, unknown> }) {
  return <div data-island={name} data-props={JSON.stringify(props)} />;
}
