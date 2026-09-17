/**
 * Badge (PPDS §7.1). Rendered only from a nav node's `plan` / `lifecycle` (N4): callers pass the
 * node, never a label.
 */
import type { Lifecycle, NavPage, Tier } from '../types.ts';

export interface BadgeProps {
  page: Pick<NavPage, 'plan' | 'lifecycle'>;
  tiers: Tier[];
}

const LABELS: Record<Lifecycle, string> = {
  new: 'New',
  preview: 'Preview',
  beta: 'Beta',
  planned: 'Planned',
  deprecated: 'Deprecated',
  legacy: 'Legacy',
};

export function Badge({ page, tiers }: BadgeProps) {
  const tier = tiers.find((candidate) => candidate.id === page.plan);
  const badges = [
    ...(page.lifecycle ? [{ kind: page.lifecycle as string, label: LABELS[page.lifecycle] }] : []),
    ...(tier?.badge ? [{ kind: 'tier', label: tier.badge }] : []),
  ];
  return (
    <>
      {badges.map((badge) => (
        <span
          key={badge.kind}
          className={`ppds-badge ppds-badge--${badge.kind}`}
          data-badge={badge.kind}
        >
          {badge.label}
        </span>
      ))}
    </>
  );
}
