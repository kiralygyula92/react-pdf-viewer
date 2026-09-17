/** Renders a route to a complete HTML document (static site generation, and the dev server). */
import { renderToStaticMarkup } from 'react-dom/server';
import { getRoutes, type EntryName, type Route } from './routes.tsx';

export { getRoutes, type EntryName, type Route };

/** Stylesheets and the client bundle a page loads, resolved by the build or the dev server. */
export interface PageAssets {
  css?: string[];
  js?: string | undefined;
  /** Island bundles the page mounts, fetched in parallel with the entry. */
  preload?: string[];
}

export function renderRoute(route: Route, assets: PageAssets = {}): string {
  const tags = (
    <>
      {(assets.css ?? []).map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {(assets.preload ?? []).map((href) => (
        <link key={href} rel="modulepreload" href={href} />
      ))}
      {assets.js && <script type="module" src={assets.js} />}
    </>
  );
  return `<!DOCTYPE html>\n${renderToStaticMarkup(route.render(tags))}\n`;
}
