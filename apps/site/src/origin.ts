/**
 * The site's canonical origin, defined once: absolute URLs in metadata, feeds and the machine
 * surface, and `%SITE_ORIGIN%` in pages. `SITE_ORIGIN` overrides it (scheme and host only).
 */
export const SITE_ORIGIN = (
  process.env['SITE_ORIGIN'] ?? 'https://react-pdf-viewer-chi.vercel.app'
).replace(/\/+$/, '');
