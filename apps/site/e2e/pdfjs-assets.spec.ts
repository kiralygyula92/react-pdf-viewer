import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The site self-hosts PDF.js's assets at the URLs `src/pdfjs.ts` configures. A missing directory
 * does not fail a render: PDF.js falls back quietly, so only a request shows it.
 */
const pdfjsDist = resolve(dirname(fileURLToPath(import.meta.url)), '../node_modules/pdfjs-dist');

test.describe('self-hosted PDF.js assets', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Static files are browser-agnostic');

  for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
    test(`/pdfjs/${dir}/ serves pdfjs-dist's ${dir}`, async ({ request }) => {
      const file =
        readdirSync(resolve(pdfjsDist, dir)).find((name) => !name.startsWith('LICENSE')) ?? '';
      expect(file).not.toBe('');
      const response = await request.get(`/pdfjs/${dir}/${file}`);
      expect(response.status()).toBe(200);
      expect((await response.body()).equals(readFileSync(resolve(pdfjsDist, dir, file)))).toBe(
        true,
      );
    });
  }
});
