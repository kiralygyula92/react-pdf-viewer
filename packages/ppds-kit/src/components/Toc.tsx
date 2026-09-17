/** Right-rail table of contents from H2/H3 with active-section highlighting (PPDS §7.4). */
export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

export function Toc({ headings }: { headings: Heading[] }) {
  const items = headings.filter((heading) => heading.depth === 2 || heading.depth === 3);
  if (items.length === 0) return null;
  return (
    <nav className="ppds-toc" aria-labelledby="ppds-toc-title">
      <p id="ppds-toc-title" className="ppds-toc__title">
        On this page
      </p>
      <ul className="ppds-toc__list">
        {items.map((heading) => (
          <li key={heading.slug} className={`ppds-toc__item ppds-toc__item--h${heading.depth}`}>
            <a href={`#${heading.slug}`} data-toc-link={heading.slug}>
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
      <div className="ppds-toc__slot" data-slot="rail-promo" />
    </nav>
  );
}
