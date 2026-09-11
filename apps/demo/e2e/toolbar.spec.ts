/**
 * Responsive toolbar: always one row; opt-in controls stay readable; narrow viewers collapse the
 * actions into an accessible "More actions" menu.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { button, rendered, toolbar, zoomLabel } from './helpers';

const containerWidth = (page: Page) => page.getByLabel(/Container width/);

test.beforeEach(async ({ page }) => {
  await page.goto('/#/');
  await rendered(page);
});

test.describe('responsive toolbar', () => {
  test('opt-in controls keep one row with a readable page input', async ({ page }) => {
    await page.getByLabel('Page number input', { exact: true }).check();
    await page.getByLabel('Zoom reset button', { exact: true }).check();

    const bar = await toolbar(page).boundingBox();
    expect(bar?.height).toBeLessThanOrEqual(48);
    await expect(button(page, 'More actions')).toHaveCount(0);

    const input = page.getByRole('textbox', { name: 'Page number' });
    await expect(input).toHaveValue('1');
    const style = await input.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        color: computed.color,
        background: computed.backgroundColor,
        width: element.getBoundingClientRect().width,
      };
    });
    // Host-wide `input[type='text']` rules must not turn it into a white, full-width box.
    expect(style.color).toBe('rgb(255, 255, 255)');
    expect(style.background).not.toBe('rgb(255, 255, 255)');
    expect(style.width).toBeLessThan(60);
    expect(await zoomLabel(page).evaluate((element) => getComputedStyle(element).fontWeight)).toBe(
      '600',
    );
  });

  test('a narrow viewer collapses the actions into the "More actions" menu', async ({ page }) => {
    await containerWidth(page).fill('400');
    const more = button(page, 'More actions');
    await expect(more).toBeVisible();
    await expect(button(page, 'Print PDF')).toHaveCount(0);
    const bar = await toolbar(page).boundingBox();
    expect(bar?.height).toBeLessThanOrEqual(48);

    await more.focus();
    await page.keyboard.press('ArrowDown');
    const menu = page.getByRole('menu', { name: 'More actions' });
    await expect(menu.getByRole('menuitem', { name: 'Enter fullscreen' })).toBeFocused();
    const violations = await new AxeBuilder({ page })
      .include('.rpv-toolbar')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(violations.violations.map((violation) => violation.id)).toEqual([]);

    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem', { name: 'Rotate PDF' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveCount(0);
    await expect(more).toBeFocused();
    await expect(page.locator('[data-event="onRotationChange"]').first()).toContainText('90');

    // Room again: the actions return to the toolbar.
    await containerWidth(page).fill('1400');
    await expect(button(page, 'Print PDF')).toBeVisible();
    await expect(button(page, 'More actions')).toHaveCount(0);
  });
});
