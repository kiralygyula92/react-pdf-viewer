/**
 * Visual regression: the default layout states on the test harness, at desktop and mobile sizes.
 *
 * Baselines are rendered in the Playwright Linux container; run `pnpm --filter site e2e:visual`
 * (compare) or `pnpm --filter site e2e:visual:update` (regenerate).
 */
import { expect, test } from '@playwright/test';
import { DESKTOP, MOBILE } from './helpers';

test.skip(!process.env['VISUAL'], 'Visual tests run in the Playwright container (VISUAL=1).');

const STATES: [name: string, query: string, rendersPage: boolean][] = [
  ['inline-100', 'mode=inline', true],
  ['inline-150', 'mode=inline&zoom=150', true],
  ['inline-25', 'mode=inline&zoom=25', true],
  ['inline-rotation-90', 'mode=inline&rotation=90', true],
  ['fullscreen-100', 'mode=fullscreen', true],
  ['fullscreen-150', 'mode=fullscreen&zoom=150', true],
  ['loading', 'mode=inline&state=loading', false],
  ['error', 'mode=inline&state=error', false],
  ['empty', 'mode=inline&state=empty', false],
];

for (const [device, viewport] of [
  ['desktop', DESKTOP],
  ['mobile', MOBILE],
] as const) {
  test.describe(device, () => {
    test.use({ viewport });

    for (const [name, query, rendersPage] of STATES) {
      test(`${device} ${name}`, async ({ page }) => {
        await page.goto(`/_internal/harness/?${query}`);
        if (rendersPage) await expect(page.locator('.rpv-page canvas')).toBeAttached();
        else await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot(`${device}-${name}.png`, { fullPage: true });
      });
    }
  });
}
