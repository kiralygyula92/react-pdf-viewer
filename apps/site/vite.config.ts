import mdx from '@mdx-js/rollup';
import rehypeShiki from '@shikijs/rehype';
import react from '@vitejs/plugin-react';
import { cpSync, createReadStream, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkSmartypants from 'remark-smartypants';
import { defineConfig, type Plugin } from 'vite';
import { rehypeHeadings } from './src/mdx/headings.ts';
import { shikiOptions } from './src/mdx/shiki.ts';
import { SITE_ORIGIN } from './src/origin.ts';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

// Vercel Analytics and Speed Insights only work behind Vercel's edge, which serves their scripts
// under /_vercel/. Compile them in only for builds that run there (or with ANALYTICS=1 to test).
const analytics = Boolean(process.env['VERCEL'] ?? process.env['ANALYTICS']);

// PDF.js assets are self-hosted: the recommended production setup (see src/pdfjs.ts). Each
// directory is served at /pdfjs/<dir>/ by the dev server and copied there by the client build.
const PDFJS_ASSET_DIRS = ['cmaps', 'standard_fonts', 'wasm', 'iccs'];
const pdfjsDist = fileURLToPath(new URL('./node_modules/pdfjs-dist/', import.meta.url));

function pdfjsAssets(): Plugin {
  let outDir: string | undefined;
  return {
    name: 'pdfjs-assets',
    configResolved(config) {
      // The prerender's SSR build needs no assets.
      outDir = config.build.ssr ? undefined : resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use('/pdfjs/', (req, res, next) => {
        const [dir = '', ...rest] = decodeURIComponent((req.url ?? '').split('?')[0] ?? '')
          .replace(/^\/+/, '')
          .split('/');
        const root = join(pdfjsDist, dir);
        const file = resolve(root, ...rest);
        if (!PDFJS_ASSET_DIRS.includes(dir) || !file.startsWith(root + sep)) return next();
        if (!statSync(file, { throwIfNoEntry: false })?.isFile()) return next();
        res.setHeader(
          'Content-Type',
          file.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream',
        );
        createReadStream(file).pipe(res);
      });
    },
    writeBundle() {
      if (!outDir) return;
      for (const dir of PDFJS_ASSET_DIRS) {
        cpSync(join(pdfjsDist, dir), join(outDir, 'pdfjs', dir), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  define: { __VERCEL_ANALYTICS__: JSON.stringify(analytics) },
  // The docs content lives outside the app, and demos import the workspace package.
  server: { port: 4321, fs: { allow: [repoRoot] } },
  plugins: [
    {
      // `%SITE_ORIGIN%` in a page becomes the origin, as it does in the kit's Markdown twins.
      name: 'site-origin',
      enforce: 'pre',
      transform: (code, id) =>
        id.endsWith('.mdx') ? code.replaceAll('%SITE_ORIGIN%', SITE_ORIGIN) : undefined,
    },
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [
          remarkFrontmatter,
          [remarkMdxFrontmatter, { name: 'frontmatter' }],
          remarkGfm,
          remarkSmartypants,
        ],
        rehypePlugins: [rehypeSlug, [rehypeShiki, shikiOptions], rehypeHeadings],
      }),
    },
    react({ include: /\.(mdx|jsx|tsx)$/ }),
    pdfjsAssets(),
  ],
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        site: fileURLToPath(new URL('./src/entry-client.tsx', import.meta.url)),
        harness: fileURLToPath(new URL('./src/entry-harness.tsx', import.meta.url)),
        viewer: fileURLToPath(new URL('./src/entry-viewer.tsx', import.meta.url)),
      },
    },
  },
});
