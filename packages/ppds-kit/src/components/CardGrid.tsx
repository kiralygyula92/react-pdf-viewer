/** Card grid `{title, one-line, href, badges}` (archetypes A, C, G, K). */
import type { JSX } from 'react';
import type { NavPage, Tier } from '../types.ts';
import { Badge } from './Badge.tsx';

export interface CardGridItem {
  title: string;
  description?: string | undefined;
  href: string;
  page?: NavPage | undefined;
}

export interface CardGridProps {
  items: CardGridItem[];
  tiers?: Tier[];
  headingLevel?: 3 | 4;
}

export function CardGrid({ items, tiers = [], headingLevel = 3 }: CardGridProps) {
  const Heading = `h${headingLevel}` as keyof JSX.IntrinsicElements;
  return (
    <ul className="ppds-cards">
      {items.map((item) => (
        <li className="ppds-card" key={item.href}>
          <Heading className="ppds-card__title">
            <a href={item.href}>{item.title}</a>
            {item.page && <Badge page={item.page} tiers={tiers} />}
          </Heading>
          {item.description && <p className="ppds-card__description">{item.description}</p>}
        </li>
      ))}
    </ul>
  );
}
