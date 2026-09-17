/**
 * Vercel Web Analytics (page views) and Speed Insights (Core Web Vitals).
 *
 * Both are cookieless and collect no personal data, so the site needs no consent banner. They are
 * compiled in only when the build runs on Vercel (`VERCEL=1`, see vite.config.ts), because the
 * scripts they load are served by the Vercel edge at `/_vercel/…`: local builds, the Playwright
 * suites and any other host stay free of them.
 */
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

export function initAnalytics(): void {
  if (!__VERCEL_ANALYTICS__) return;
  // The site loads a whole document per navigation, so the script never has to watch for routing.
  inject({ mode: 'production', disableAutoTrack: false });
  injectSpeedInsights();
}
