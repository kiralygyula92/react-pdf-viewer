/** Docs sidebar rendered from nav data only (PPDS §4, P2, N1). */
import type { NavNode, PluginModel } from '../types.ts';
import { Badge } from './Badge.tsx';

export interface SidebarProps {
  model: PluginModel;
  current: string;
  descriptions: Map<string, string>;
  /**
   * Generated nodes injected under a section group (N3: generated API pages are never typed into
   * nav.json by hand), keyed by the group pathname.
   */
  injected?: Record<string, NavNode[]> | undefined;
}

export function Sidebar({ model, current, descriptions, injected = {} }: SidebarProps) {
  const { nav, titles, config, byPath } = model;
  const titleOf = (node: NavNode) => node.title ?? titles[node.pathname] ?? node.subheader ?? '';
  const withInjected = (node: NavNode): NavNode[] => [
    ...(node.children ?? []),
    ...(injected[node.pathname] ?? []),
  ];
  const containsCurrent = (node: NavNode): boolean =>
    node.pathname === current || withInjected(node).some(containsCurrent);
  const link = (node: NavNode) => {
    const page = byPath.get(node.pathname);
    return (
      <a
        className="ppds-sidebar__link"
        href={node.pathname}
        title={descriptions.get(node.pathname)}
        aria-current={node.pathname === current ? 'page' : undefined}
      >
        <span>{titleOf(node)}</span>
        {page && <Badge page={page} tiers={config.tiers} />}
      </a>
    );
  };
  return (
    <nav className="ppds-sidebar" aria-label={`${config.name} documentation`}>
      {nav.map((section) => (
        <details
          key={section.pathname}
          className="ppds-sidebar__section"
          open={containsCurrent(section) || undefined}
        >
          <summary className="ppds-sidebar__section-title">{titleOf(section)}</summary>
          <ul className="ppds-sidebar__list">
            {withInjected(section).map((node) =>
              node.children ? (
                <li className="ppds-sidebar__group" key={node.pathname}>
                  <span className="ppds-sidebar__subheader">{titleOf(node)}</span>
                  <ul className="ppds-sidebar__list">
                    {node.children.map((leaf) => (
                      <li key={leaf.pathname}>{link(leaf)}</li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={node.pathname}>{link(node)}</li>
              ),
            )}
          </ul>
        </details>
      ))}
    </nav>
  );
}
