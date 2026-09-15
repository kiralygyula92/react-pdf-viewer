import { expect, test } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redirectTables } from 'ppds-kit';

/**
 * Live check of every legacy URL in migration/url-map.csv (PPDS brief §6.7, check 22). Legacy
 * URLs are hash fragments, which only the browser sees, so they redirect client-side
 * (EXCEPTIONS E-01). Set PPDS_QA_REPORT=1 to write qa/redirect-check.csv.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const { fragments, paths } = redirectTables(
  readFileSync(resolve(repoRoot, 'migration/url-map.csv'), 'utf8'),
);

test.describe('legacy redirects', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Redirect data is browser-agnostic');

  test('every legacy URL lands on its target page', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const rows: string[][] = [];
    for (const [fragment, target] of Object.entries(fragments)) {
      await page.goto(`/${fragment}`);
      const expected = new URL(target, baseURL);
      await page.waitForURL(
        (url) => url.pathname + url.search === expected.pathname + expected.search,
        {
          timeout: 10_000,
        },
      );
      await page.waitForLoadState('load');
      const status = await page.evaluate(
        () =>
          (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)
            ?.responseStatus ?? 0,
      );
      const final = new URL(page.url());
      const ok =
        final.pathname + final.search === expected.pathname + expected.search &&
        status > 0 &&
        status < 400;
      rows.push([
        `/${fragment}`,
        target,
        'client-side (E-01)',
        final.pathname + final.search,
        String(status),
        ok ? 'pass' : 'fail',
      ]);
    }
    for (const [from, to] of paths) {
      rows.push([from, to, '301', '', '', 'pending deploy (G-49)']);
    }

    if (process.env['PPDS_QA_REPORT']) {
      const csv = (value: string) =>
        /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
      const out = resolve(repoRoot, 'qa/redirect-check.csv');
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(
        out,
        [
          ['legacy_url', 'expected_target', 'mechanism', 'final_url', 'final_status', 'result'],
          ...rows,
        ]
          .map((row) => row.map(csv).join(','))
          .join('\n') + '\n',
      );
    }
    expect(rows.filter((row) => row[5] === 'fail')).toEqual([]);
    expect(rows.length).toBeGreaterThan(0);
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
