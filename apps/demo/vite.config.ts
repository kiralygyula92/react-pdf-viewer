import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Set DEMO_BASE (e.g. "/react-pdf-viewer/") when deploying under a sub-path.
  base: process.env['DEMO_BASE'] ?? '/',
  plugins: [react()],
  preview: {
    port: 4173,
    strictPort: true,
  },
});
