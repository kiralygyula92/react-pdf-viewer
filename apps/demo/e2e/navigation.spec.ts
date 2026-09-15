import { expect, test } from '@playwright/test';
import { button, openView, pageLabel, zoomLabel } from './helpers';

test.describe('navigation', () => {
  test('previous/next with disabled ends and a live page label', async ({ page }) => {
    await openView(page, { src: '/samples/letter-3pages.pdf' });
    await expect(pageLabel(page)).toHaveText('1 / 3');
    await expect(pageLabel(page)).toHaveAttribute('aria-live', 'polite');
    await expect(button(page, 'Previous page')).toBeDisabled();

    await button(page, 'Next page').click();
    await expect(pageLabel(page)).toHaveText('2 / 3');
    await expect(page.getByRole('img', { name: 'Page 2 of 3' })).toBeVisible();
    await button(page, 'Next page').click();
    await expect(pageLabel(page)).toHaveText('3 / 3');
    await expect(button(page, 'Next page')).toBeDisabled();
    await button(page, 'Previous page').click();
    await expect(pageLabel(page)).toHaveText('2 / 3');
  });

  test('deep link opens page 2 at 150%, and changes update the address bar', async ({ page }) => {
    await openView(page, { src: '/samples/multipage.pdf', page: '2', zoom: '150' });
    await expect(pageLabel(page)).toHaveText('2 / 40');
    await expect(zoomLabel(page)).toHaveText('150%');

    await button(page, 'Next page').click();
    await expect(page).toHaveURL(/page=3/);
    await button(page, 'Zoom in').click();
    await expect(page).toHaveURL(/zoom=155/);
    await expect(zoomLabel(page)).toHaveText('155%');
  });

  test('an out-of-range deep link is clamped and written back', async ({ page }) => {
    await openView(page, { src: '/samples/letter-3pages.pdf', page: '9' });
    await expect(pageLabel(page)).toHaveText('3 / 3');
    await expect(page).toHaveURL(/page=3/);
  });

  test('keyboard shortcuts while the document area has focus', async ({ page }) => {
    await openView(page, { src: '/samples/letter-3pages.pdf' });
    await page.getByRole('group', { name: 'Document' }).focus();
    await page.keyboard.press('PageDown');
    await expect(pageLabel(page)).toHaveText('2 / 3');
    await page.keyboard.press('End');
    await expect(pageLabel(page)).toHaveText('3 / 3');
    await page.keyboard.press('Home');
    await expect(pageLabel(page)).toHaveText('1 / 3');
    await page.keyboard.press('ArrowRight');
    await expect(pageLabel(page)).toHaveText('2 / 3');
    await page.keyboard.press('+');
    await expect(zoomLabel(page)).toHaveText('105%');
    await page.keyboard.press('0');
    await expect(zoomLabel(page)).toHaveText('100%');
  });
});
