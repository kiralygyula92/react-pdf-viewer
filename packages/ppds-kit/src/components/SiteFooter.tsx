/** Global footer shared by both surfaces: the columns `portfolio.json` defines, in order. */
import { slugify } from '../markdown.ts';
import type { PortfolioConfig } from '../types.ts';

export interface SiteFooterProps {
  portfolio: PortfolioConfig;
  feeds?: { title: string; href: string }[];
}

export function SiteFooter({ portfolio, feeds = [] }: SiteFooterProps) {
  return (
    <footer className="ppds-site-footer">
      <div className="ppds-site-footer__inner">
        <div className="ppds-site-footer__columns">
          {Object.entries(portfolio.footer).map(([column, links]) => (
            <section
              key={column}
              className="ppds-site-footer__column"
              aria-labelledby={`ppds-footer-${slugify(column)}`}
            >
              <h2 id={`ppds-footer-${slugify(column)}`} className="ppds-site-footer__heading">
                {column}
              </h2>
              <ul>
                {links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.title}</a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="ppds-site-footer__bottom">
          <p>{portfolio.copyright}</p>
          <ul className="ppds-site-footer__social">
            {(portfolio.social ?? []).map((link) => (
              <li key={link.href}>
                <a href={link.href} rel="noopener">
                  {link.label}
                </a>
              </li>
            ))}
            {feeds.map((feed) => (
              <li key={feed.href}>
                <a href={feed.href}>{feed.title}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
