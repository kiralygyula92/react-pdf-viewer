/**
 * Builds the static site: the client bundles with Vite, then every route rendered to HTML with
 * React, then the machine surface and hosting artefacts (llms.txt, twins, sitemap, feeds, OG
 * images, redirects and the search index).
 */
import { buildSiteArtifacts } from 'ppds-kit/artifacts';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { build, createServer, type Manifest } from 'vite';
import type { EntryName, PageAssets, Route } from '../src/entry-server.tsx';
import { SITE_ORIGIN as origin } from '../src/origin.ts';
import { machineOptions } from './machine.ts';

const root = resolve(import.meta.dirname, '..');
const repoRoot = resolve(root, '../..');
const dist = join(root, 'dist');

const started = Date.now();
rmSync(dist, { recursive: true, force: true });

// ── 1. Client bundles ───────────────────────────────────────────────────────
await build({ root, mode: 'production' });
const manifest = JSON.parse(readFileSync(join(dist, '.vite/manifest.json'), 'utf8')) as Manifest;
rmSync(join(dist, '.vite'), { recursive: true, force: true });

const ENTRY_FILES: Record<EntryName, string> = {
  site: 'src/entry-client.tsx',
  harness: 'src/entry-harness.tsx',
  viewer: 'src/entry-viewer.tsx',
};

/** Stylesheets of a chunk and of everything it imports statically, in load order. */
const cssOf = (key: string, seen = new Set<string>()): string[] => {
  if (seen.has(key)) return [];
  seen.add(key);
  const chunk = manifest[key];
  if (!chunk) return [];
  return [
    ...(chunk.imports ?? []).flatMap((imported) => cssOf(imported, seen)),
    ...(chunk.css ?? []),
  ];
};

/** Island components, so a page can preload the bundle it is about to mount. */
const ISLAND_MODULES: Record<string, string> = {
  demo: 'src/islands/DemoFrame.tsx',
  scenario: 'src/islands/ScenarioFrame.tsx',
};

const assetsFor = (entry: EntryName | undefined, islands: string[] = []): PageAssets => {
  if (!entry) return {};
  const key = ENTRY_FILES[entry];
  const chunk = manifest[key];
  if (!chunk) throw new Error(`No built bundle for entry "${entry}"`);
  const preload = islands
    .map((island) => manifest[ISLAND_MODULES[island] ?? '']?.file)
    .filter((file): file is string => Boolean(file))
    .map((file) => `/${file}`);
  return {
    css: [...new Set(cssOf(key))].map((file) => `/${file}`),
    js: `/${chunk.file}`,
    preload: [...new Set(preload)],
  };
};

// ── 2. Pages ────────────────────────────────────────────────────────────────
const server = await createServer({
  root,
  mode: 'production',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
});
try {
  const { getRoutes, renderRoute } = (await server.ssrLoadModule('/src/entry-server.tsx')) as {
    getRoutes: () => Route[];
    renderRoute: (route: Route, assets: PageAssets) => string;
  };
  const routes = getRoutes();
  for (const route of routes) {
    // Two passes: the first finds the islands the page mounts, the second preloads their bundles.
    const islands = [
      ...new Set(
        [...renderRoute(route, {}).matchAll(/data-island="([a-z]+)"/g)].flatMap(
          (match) => match[1] ?? [],
        ),
      ),
    ];
    const html = renderRoute(route, assetsFor(route.entry, islands));
    const file = join(dist, route.file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
  }
  console.log(`${routes.length} page(s) rendered`);
} finally {
  await server.close();
}

// ── 3. Machine surface and hosting artefacts ────────────────────────────────
await buildSiteArtifacts({
  ...machineOptions,
  dist,
  origin,
  portfolio: join(repoRoot, 'content/portfolio.json'),
  urlMap: join(repoRoot, 'migration/url-map.csv'),
  // Pages built before launch and folded into others (DECISIONS D-07); URLs are never dropped.
  redirects: [
    ['/products/react-pdf-viewer/', '/react-pdf-viewer/'],
    ['/react-pdf-viewer/demos/document-viewer/', '/react-pdf-viewer/demos/playground/'],
  ],
  log: (message) => console.log(message),
});

console.log(`Built in ${((Date.now() - started) / 1000).toFixed(1)}s`);
