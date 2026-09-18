/** Real 404 for unknown paths. Legacy `#/…` links are redirected first. */
import type { ReactNode } from 'react';
import { PlainLayout } from 'ppds-kit/components';
import { LegacyRedirect } from '../components/LegacyRedirect.tsx';
import { feeds, getModel, getPortfolio, pageMeta, PLUGIN_ID } from '../lib/site.ts';

export function NotFoundPage({ assets }: { assets: ReactNode }) {
  const meta = pageMeta(
    { pathname: '/404.html' },
    'Page not found',
    'The page you were looking for does not exist or has moved.',
    false,
  );
  return (
    <PlainLayout
      meta={meta}
      config={getModel().config}
      portfolio={getPortfolio()}
      feeds={feeds}
      headExtra={<LegacyRedirect />}
      assets={assets}
    >
      <section className="ppds-section">
        <p className="ppds-eyebrow">404</p>
        <h1 className="ppds-section__title">Page not found</h1>
        <p className="ppds-section__subtitle">
          The page you were looking for does not exist or has moved.
        </p>
        <div className="ppds-actions">
          <a className="ppds-button ppds-button--primary" href={`/${PLUGIN_ID}/`}>
            Go to the documentation
          </a>
        </div>
      </section>
    </PlainLayout>
  );
}
