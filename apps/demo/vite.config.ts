import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// PDF.js assets are self-hosted: the recommended production setup (see src/pdfjs.ts).
const PDFJS_ASSET_DIRS = ['cmaps', 'standard_fonts', 'wasm', 'iccs'];

export default defineConfig({
  // Set DEMO_BASE (e.g. "/react-pdf-viewer/") when deploying under a sub-path.
  base: process.env['DEMO_BASE'] ?? '/',
  // Hash routing needs no SPA fallback, and missing files must 404 (error examples rely on it).
  appType: 'mpa',
  plugins: [
    react(),
    viteStaticCopy({
      targets: PDFJS_ASSET_DIRS.map((dir) => ({
        src: `node_modules/pdfjs-dist/${dir}`,
        dest: 'pdfjs',
      })),
    }),
  ],
  preview: {
    port: 4173,
    strictPort: true,
  },
});
