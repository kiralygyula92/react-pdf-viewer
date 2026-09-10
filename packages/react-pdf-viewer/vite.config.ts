/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react(), dts({ tsconfigPath: './tsconfig.build.json', entryRoot: 'src' })],
  build: {
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: {
        index: fromRoot('./src/index.ts'),
        compat: fromRoot('./src/compat.ts'),
      },
      formats: ['es'],
      cssFileName: 'styles',
    },
    rolldownOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^pdfjs-dist($|\/)/],
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
  },
});
