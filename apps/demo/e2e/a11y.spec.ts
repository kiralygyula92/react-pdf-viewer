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
  ['playground', '/#/', true],
  ['standalone viewer', '/#/view?src=/samples/letter-3pages.pdf', true],
  ['standalone open form', '/#/view', false],
  ['parity loading', '/#/parity?state=loading', false],
  ['parity error', '/#/parity?state=error', false],
  ['parity empty', '/#/parity?state=empty', false],
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

  test('axe: no violations — examples (all mounted)', async ({ page }) => {
    await page.goto('/#/examples');
    // Mount every lazily rendered example (their layout shifts as they mount, so scroll by script).
    await page.evaluate(async () => {
      for (const section of document.querySelectorAll('.demo-example')) {
        section.scrollIntoView();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    });
    await page.waitForLoadState('networkidle');
    expect(await violations(page)).toEqual([]);
  });

  for (const [device, size] of [
    ['desktop', DESKTOP],
    ['mobile', MOBILE],
  ] as const) {
    for (const mode of ['inline', 'fullscreen']) {
      test(`M3: no violations — default viewer, ${device} ${mode}`, async ({ page }) => {
        await page.setViewportSize(size);
        await page.goto(`/#/parity?mode=${mode}`);
        await rendered(page);
        expect(await violations(page)).toEqual([]);
      });
    }
  }

  test('keyboard walkthrough: document area, then a single toolbar tab stop', async ({ page }) => {
    await page.goto('/#/view?src=/samples/letter-3pages.pdf');
    await rendered(page);
    const documentArea = page.getByRole('group', { name: 'Document' });
    for (
      let i = 0;
      i < 20 && !(await documentArea.evaluate((el) => el === document.activeElement));
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
