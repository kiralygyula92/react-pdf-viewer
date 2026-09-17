/** Development server: Vite for assets and hot reload, React for the pages. */
import { createServer as createHttpServer } from 'node:http';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import type { PageAssets, Route } from '../src/entry-server.tsx';

const root = resolve(import.meta.dirname, '..');
const port = Number(process.argv.find((arg) => arg.startsWith('--port='))?.slice(7) ?? 4321);

const vite = await createServer({ root, appType: 'custom', server: { middlewareMode: true } });

const DEV_ENTRIES: Record<string, string> = {
  site: '/src/entry-client.tsx',
  harness: '/src/entry-harness.tsx',
  viewer: '/src/entry-viewer.tsx',
};

const server = createHttpServer((request, response) => {
  vite.middlewares(request, response, async () => {
    const url = new URL(request.url ?? '/', `http://localhost:${port}`);
    try {
      const { getRoutes, renderRoute } = (await vite.ssrLoadModule('/src/entry-server.tsx')) as {
        getRoutes: () => Route[];
        renderRoute: (route: Route, assets: PageAssets) => string;
      };
      const routes = getRoutes();
      // Serve `/path` as `/path/` would be served in production (trailing slashes, R4).
      const pathname = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
      const route =
        routes.find((candidate) => candidate.pathname === url.pathname) ??
        routes.find((candidate) => candidate.pathname === pathname);
      const notFound = routes.find((candidate) => candidate.pathname === '/404.html');
      const target = route ?? notFound;
      if (!target) {
        response.writeHead(404).end('Not found');
        return;
      }
      const assets: PageAssets = target.entry ? { js: DEV_ENTRIES[target.entry] } : {};
      const html = await vite.transformIndexHtml(url.pathname, renderRoute(target, assets));
      response
        .writeHead(route ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8' })
        .end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      response.writeHead(500, { 'Content-Type': 'text/plain' }).end(String(error));
    }
  });
});

server.listen(port, () => console.log(`Site running at http://localhost:${port}/`));
