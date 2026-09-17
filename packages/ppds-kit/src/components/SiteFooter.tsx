/** Global footer shared by both surfaces (PPDS §2.3): four fixed columns. */
import type { PortfolioConfig } from '../types.ts';

const COLUMNS = ['Products', 'Resources', 'Explore', 'Company'] as const;

export interface SiteFooterProps {
  portfolio: PortfolioConfig;
  feeds?: { title: string; href: string }[];
}

export function SiteFooter({ portfolio, feeds = [] }: SiteFooterProps) {
  return (
    <footer className="ppds-site-footer">
      <div className="ppds-site-footer__inner">
        <div className="ppds-site-footer__columns">
          {COLUMNS.map((column) => (
            <section
              key={column}
              className="ppds-site-footer__column"
              aria-labelledby={`ppds-footer-${column}`}
            >
              <h2 id={`ppds-footer-${column}`} className="ppds-site-footer__heading">
                {column}
              </h2>
              <ul>
                {portfolio.footer[column].map((link) => (
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
