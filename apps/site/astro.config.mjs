// @ts-check
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { ppds } from 'ppds-kit/integration';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Canonical origin for canonicals, OG images, the sitemap and llms.txt (DECISIONS D-03).
 * Defaults to the Cloudflare Pages project URL until a custom domain exists (GAPS G-49).
 */
const site = process.env['SITE_ORIGIN'] ?? 'https://react-pdf-viewer.pages.dev';

// PDF.js assets are self-hosted: the recommended production setup (see src/pdfjs.ts).
const PDFJS_ASSET_DIRS = ['cmaps', 'standard_fonts', 'wasm', 'iccs'];

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  server: { port: 4321 },
  preview: { port: 4173 },
  integrations: [
    react(),
    mdx(),
    ppds({
      repoRoot,
      contentRoot: `${repoRoot}content/react-pdf-viewer`,
      portfolio: `${repoRoot}content/portfolio.json`,
      urlMap: `${repoRoot}migration/url-map.csv`,
    }),
  ],
  markdown: {
    shikiConfig: { theme: 'github-dark-dimmed', wrap: false },
  },
  vite: {
    plugins: [
      viteStaticCopy({
        targets: PDFJS_ASSET_DIRS.map((dir) => ({
          src: `node_modules/pdfjs-dist/${dir}`,
          dest: 'pdfjs',
        })),
      }),
    ],
    server: { fs: { allow: [repoRoot] } },
  },
});
