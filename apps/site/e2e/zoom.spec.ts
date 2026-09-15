import { expect, test } from '@playwright/test';
import { button, openView, pageBox, pageSize, viewport, zoomLabel } from './helpers';

test.describe('zoom', () => {
  test('5% steps, rounded label, true size, and bounds', async ({ page }) => {
    await openView(page, { src: '/samples/letter-3pages.pdf' });
    await expect(zoomLabel(page)).toHaveText('100%');
    expect(await pageSize(page)).toEqual({ width: 612, height: 792 });

    for (let i = 0; i < 10; i++) await button(page, 'Zoom in').click();
    await expect(zoomLabel(page)).toHaveText('150%');
    await expect.poll(() => pageSize(page)).toEqual({ width: 918, height: 1188 });

    await page.getByRole('group', { name: 'Document' }).focus();
    for (let i = 0; i < 30; i++) await page.keyboard.press('-');
    await expect(zoomLabel(page)).toHaveText('25%');
    await expect(button(page, 'Zoom out')).toBeDisabled();
    await expect(button(page, 'Zoom in')).toBeEnabled();
  });

  test('the ceiling is 500%', async ({ page }) => {
    await openView(page, { src: '/samples/letter-3pages.pdf', zoom: '495' });
    await button(page, 'Zoom in').click();
    await expect(zoomLabel(page)).toHaveText('500%');
    await expect(button(page, 'Zoom in')).toBeDisabled();
  });

  test('fits the width at 100%, shows true size and scrolls when zoomed', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await openView(page, { src: '/samples/letter-3pages.pdf' });
    const available = await viewport(page).evaluate((element) => element.clientWidth - 32);
    await expect.poll(async () => (await pageSize(page)).width).toBeLessThanOrEqual(available);
    const fitted = await pageSize(page);
    expect(fitted.height / fitted.width).toBeCloseTo(792 / 612, 2);

    await button(page, 'Zoom in').click();
    await expect.poll(async () => (await pageSize(page)).width).toBeCloseTo(612 * 1.05, 0);
    const scrolls = await viewport(page).evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    );
    expect(scrolls).toBe(true);
  });

  test('a zoomed page is never clipped on the left', async ({ page }) => {
    await page.goto('/_internal/harness/?mode=fullscreen&zoom=500');
    await expect(page.locator('.rpv-page canvas')).toBeAttached();
    const [container, box] = await Promise.all([
      viewport(page).boundingBox(),
      pageBox(page).boundingBox(),
    ]);
    expect(container && box).toBeTruthy();
    if (!container || !box) return;
    expect(box.x).toBeGreaterThanOrEqual(container.x);
    // Scrolling fully right reveals the right edge.
    await viewport(page).evaluate((element) => element.scrollTo({ left: element.scrollWidth }));
    const scrolled = await pageBox(page).boundingBox();
    expect(scrolled && scrolled.x + scrolled.width).toBeLessThanOrEqual(
      container.x + container.width,
    );
  });
});
