import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redirectTables } from 'ppds-kit';

/**
 * Live check of every legacy URL in migration/url-map.csv (check 22). Legacy URLs are hash
 * fragments, which only the browser sees, so they redirect client-side (EXCEPTIONS E-01).
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const { fragments } = redirectTables(
  readFileSync(resolve(repoRoot, 'migration/url-map.csv'), 'utf8'),
);

test.describe('legacy redirects', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Redirect data is browser-agnostic');

  test('every legacy URL lands on its target page', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const entries = Object.entries(fragments);
    expect(entries.length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const [fragment, target] of entries) {
      await page.goto(`/${fragment}`);
      const expected = new URL(target, baseURL);
      const path = (url: URL) => url.pathname + url.search;
      await page.waitForURL((url) => path(url) === path(expected), { timeout: 10_000 });
      await page.waitForLoadState('load');
      const status = await page.evaluate(
        () =>
          (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)
            ?.responseStatus ?? 0,
      );
      if (status < 200 || status >= 400) failures.push(`/${fragment} → ${target}: HTTP ${status}`);
    }
    expect(failures).toEqual([]);
  });

  test('a legacy viewer link opens its document in the playground (DECISIONS D-07)', async ({
    page,
  }) => {
    await page.goto('/#/view?src=%2Fsamples%2Fmultipage.pdf&page=2&zoom=150');
    await expect(page).toHaveURL(/\/react-pdf-viewer\/demos\/playground\/\?src=/);
    const toolbar = page.getByRole('toolbar', { name: 'PDF controls' });
    await expect(toolbar.locator('.rpv-toolbar__pages')).toContainText('/ 40');
  });
});
