import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { button, DESKTOP, MOBILE, rendered, zoomLabel } from './helpers';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return results.violations.map(
    ({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
}

const ROUTES: [name: string, path: string, waitForRender: boolean][] = [
  ['playground', '/react-pdf-viewer/demos/playground/', true],
  [
    'standalone viewer',
    '/react-pdf-viewer/demos/document-viewer/?src=/samples/letter-3pages.pdf',
    true,
  ],
  ['standalone open form', '/react-pdf-viewer/demos/document-viewer/', false],
  ['docs overview', '/react-pdf-viewer/', false],
  ['home', '/', false],
  ['product landing', '/products/react-pdf-viewer/', false],
  ['harness loading', '/_internal/harness/?state=loading', false],
  ['harness error', '/_internal/harness/?state=error', false],
  ['harness empty', '/_internal/harness/?state=empty', false],
];

test.describe('accessibility', () => {
  for (const [name, path, waitForRender] of ROUTES) {
    test(`axe: no WCAG 2.2 AA violations — ${name}`, async ({ page }) => {
      await page.goto(path);
      if (waitForRender) await rendered(page);
      else await page.waitForLoadState('networkidle');
      expect(await violations(page)).toEqual([]);
    });
  }

  test('axe: no violations on any page in the sitemap, light and dark', async ({
    page,
    browserName,
  }) => {
    // One engine is enough for a site-wide sweep; the per-route tests above run in all three.
    test.skip(browserName !== 'chromium', 'site-wide sweep runs in Chromium');
    test.setTimeout(600_000);
    const sitemap = await (await page.request.get('/sitemap.xml')).text();
    const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => new URL(match[1] ?? '').pathname,
    );
    expect(paths.length).toBeGreaterThan(50);
    const failures: string[] = [];
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of paths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        for (const violation of await violations(page))
          failures.push(`${scheme} ${path}: ${violation}`);
      }
    }
    expect(failures).toEqual([]);
  });

  for (const [device, size] of [
    ['desktop', DESKTOP],
    ['mobile', MOBILE],
  ] as const) {
    for (const mode of ['inline', 'fullscreen']) {
      test(`no violations — default viewer, ${device} ${mode}`, async ({ page }) => {
        await page.setViewportSize(size);
        await page.goto(`/_internal/harness/?mode=${mode}`);
        await rendered(page);
        expect(await violations(page)).toEqual([]);
      });
    }
  }

  test('keyboard walkthrough: document area, then a single toolbar tab stop', async ({ page }) => {
    await page.goto('/react-pdf-viewer/demos/document-viewer/?src=/samples/letter-3pages.pdf');
    await rendered(page);
    const documentArea = page.getByRole('group', { name: 'Document' });
    for (
      let i = 0;
      i < 250 && !(await documentArea.evaluate((el) => el === document.activeElement));
      i++
    ) {
      await page.keyboard.press('Tab');
    }
    await expect(documentArea).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(button(page, 'Zoom out')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(button(page, 'Zoom in')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(zoomLabel(page)).toHaveText('105%');
    // Focus is visible.
    const outline = await button(page, 'Zoom in').evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(outline).not.toBe('none');
    // The toolbar is a single tab stop: Shift+Tab leaves it in one step, back to the document.
    await page.keyboard.press('Shift+Tab');
    await expect(documentArea).toBeFocused();
  });
});
