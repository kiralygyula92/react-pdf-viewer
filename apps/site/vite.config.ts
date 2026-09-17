import mdx from '@mdx-js/rollup';
import rehypeShiki from '@shikijs/rehype';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkSmartypants from 'remark-smartypants';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { rehypeHeadings } from './src/mdx/headings.ts';
import { shikiOptions } from './src/mdx/shiki.ts';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

// Vercel Analytics and Speed Insights only work behind Vercel's edge, which serves their scripts
// under /_vercel/. Compile them in only for builds that run there (or with ANALYTICS=1 to test).
const analytics = Boolean(process.env['VERCEL'] ?? process.env['ANALYTICS']);

// PDF.js assets are self-hosted: the recommended production setup (see src/pdfjs.ts).
const PDFJS_ASSET_DIRS = ['cmaps', 'standard_fonts', 'wasm', 'iccs'];

export default defineConfig({
  define: { __VERCEL_ANALYTICS__: JSON.stringify(analytics) },
  // The docs content lives outside the app, and demos import the workspace package.
  server: { port: 4321, fs: { allow: [repoRoot] } },
  plugins: [
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
    viteStaticCopy({
      targets: PDFJS_ASSET_DIRS.map((dir) => ({
        src: `node_modules/pdfjs-dist/${dir}`,
        dest: 'pdfjs',
      })),
    }),
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
