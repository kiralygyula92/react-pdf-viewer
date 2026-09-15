import { configurePdfJs } from '@kiralygyula92/react-pdf-viewer';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Self-hosted worker and assets, copied to /pdfjs by vite-plugin-static-copy (astro.config.mjs).
const assets = `${import.meta.env.BASE_URL}pdfjs/`;

configurePdfJs({
  workerSrc,
  cMapUrl: `${assets}cmaps/`,
  standardFontDataUrl: `${assets}standard_fonts/`,
  wasmUrl: `${assets}wasm/`,
  iccUrl: `${assets}iccs/`,
});
