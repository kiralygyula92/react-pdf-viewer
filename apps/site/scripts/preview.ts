/** Serves the built site exactly as a static host would: directory URLs, 404 page, no rewrites. */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const dist = resolve(import.meta.dirname, '../dist');
const port = Number(process.argv.find((arg) => arg.startsWith('--port='))?.slice(7) ?? 4173);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
  '.bcmap': 'application/octet-stream',
};

function resolveFile(pathname: string): string | undefined {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const path = join(dist, relative);
  if (existsSync(path) && statSync(path).isFile()) return path;
  const index = join(path, 'index.html');
  if (existsSync(index)) return index;
  return undefined;
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${port}`);
  const file = resolveFile(url.pathname);
  const notFound = join(dist, '404.html');
  const target = file ?? (existsSync(notFound) ? notFound : undefined);
  if (!target) {
    response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    return;
  }
  response.writeHead(file ? 200 : 404, {
    'Content-Type': TYPES[extname(target)] ?? 'application/octet-stream',
  });
  createReadStream(target).pipe(response);
}).listen(port, () => console.log(`Preview running at http://localhost:${port}/`));
