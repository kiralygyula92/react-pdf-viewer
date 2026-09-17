/** Resource chip row under a capability H1 (archetype B), rendered from frontmatter `links`. */
export interface ResourceChipsProps {
  links: Record<string, string>;
  repo: string;
}

const LABELS: Record<string, string> = {
  issues: 'Feedback',
  source: 'Source',
  spec: 'Standard',
  design: 'Design',
  size: 'Bundle size',
};

export function ResourceChips({ links, repo }: ResourceChipsProps) {
  const resolve = (key: string, value: string) =>
    key === 'source' && !/^https?:/.test(value) ? `${repo}/tree/main/${value}` : value;
  const chips = Object.entries(links).map(([key, value]) => ({
    key,
    label: LABELS[key] ?? key,
    href: resolve(key, value),
  }));
  if (chips.length === 0) return null;
  return (
    <ul className="ppds-chips" aria-label="Resources">
      {chips.map((chip) => (
        <li key={chip.key}>
          <a className="ppds-chip" href={chip.href} rel="noopener" data-chip={chip.key}>
            {chip.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
