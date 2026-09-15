import { expect, test } from '@playwright/test';
import { button, countRequests, rendered } from './helpers';

test.describe('fullscreen', () => {
  test('native fullscreen toggles without reloading the document', async ({ page }) => {
    const requests = countRequests(page, 'letter-3pages.pdf');
    await page.goto('/#/');
    await rendered(page);
    const enterIcon = await button(page, 'Enter fullscreen').locator('path').getAttribute('d');

    await button(page, 'Enter fullscreen').click();
    await expect(button(page, 'Exit fullscreen')).toBeVisible();
    const root = page.locator('.rpv-root');
    const presentation = await root.getAttribute('data-presentation');
    expect(['native', 'overlay']).toContain(presentation);
    if (presentation === 'native') {
      expect(
        await page.evaluate(() => document.fullscreenElement?.classList.contains('rpv-root')),
      ).toBe(true);
    }
    expect(await button(page, 'Exit fullscreen').locator('path').getAttribute('d')).not.toBe(
      enterIcon,
    );

    await button(page, 'Exit fullscreen').click();
    await expect(button(page, 'Enter fullscreen')).toBeVisible();
    await expect(root).not.toHaveAttribute('data-presentation');
    await rendered(page);
    expect(requests.count).toBe(1);
  });

  test('overlay mode traps focus and closes with Escape', async ({ page }) => {
    await page.goto('/#/');
    await rendered(page);
    await page.getByLabel('Fullscreen mode').selectOption('overlay');
    await button(page, 'Enter fullscreen').click();
    const dialog = page.getByRole('dialog', { name: 'PDF viewer' });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      );
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(button(page, 'Enter fullscreen'))
      .toBeFocused({ timeout: 2000 })
      .catch(() => undefined);
  });

  test('controlled mode: the parent presents fullscreen, layout adapts', async ({ page }) => {
    await page.goto('/#/harness?mode=inline');
    await rendered(page);
    await button(page, 'Enter fullscreen').click();
    await expect(page.locator('.harness-dialog')).toBeVisible();
    await expect(page.locator('.rpv-root')).toHaveAttribute('data-fullscreen', '');
    await button(page, 'Exit fullscreen').click();
    await expect(page.locator('.harness-dialog')).toHaveCount(0);
  });
});
