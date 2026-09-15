import { expect, test, type Page } from '@playwright/test';
import { button, openView, pageSize } from './helpers';

const orientation = async (page: Page) => {
  const { width, height } = await pageSize(page);
  return width > height ? 'landscape' : 'portrait';
};

test.describe('rotation', () => {
  test('rotate cycles 0 → 90 → 180 → 270 → 0', async ({ page }) => {
    await openView(page, { src: '/samples/letter-3pages.pdf' });
    expect(await orientation(page)).toBe('portrait');
    const expected = ['landscape', 'portrait', 'landscape', 'portrait'];
    for (const [index, value] of expected.entries()) {
      await button(page, 'Rotate PDF').click();
      await expect(page).toHaveURL(new RegExp(`rotation=${((index + 1) * 90) % 360}`));
      await expect.poll(() => orientation(page)).toBe(value);
    }
  });

  test('a page with /Rotate 90 displays in landscape', async ({ page }) => {
    await openView(page, { src: '/samples/intrinsic-rotation.pdf', page: '2' });
    await expect.poll(() => orientation(page)).toBe('landscape');
    // The user rotation is added to the intrinsic one.
    await button(page, 'Rotate PDF').click();
    await expect.poll(() => orientation(page)).toBe('portrait');
  });

  test('a rotation deep link is applied', async ({ page }) => {
    await openView(page, { src: '/samples/letter-3pages.pdf', rotation: '90' });
    await expect.poll(() => orientation(page)).toBe('landscape');
  });
});
