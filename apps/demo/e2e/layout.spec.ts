/**
 * Computed styles of the default layout (sizes, spacing, colors) on the test harness.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { button, DESKTOP, MOBILE, pageBox, pageSize, rendered, toolbar, viewport } from './helpers';

async function styles(locator: Locator, properties: string[]) {
  return locator.evaluate((element, names) => {
    const computed = getComputedStyle(element);
    return Object.fromEntries(names.map((name) => [name, computed.getPropertyValue(name)]));
  }, properties);
}

async function open(page: Page, query: string) {
  await page.goto(`/#/harness?${query}`);
  await rendered(page);
}

test.describe('layout — desktop (1280×800)', () => {
  test.use({ viewport: DESKTOP });

  test('inline viewport', async ({ page }) => {
    await open(page, 'mode=inline');
    expect(
      await styles(viewport(page), [
        'max-width',
        'min-height',
        'max-height',
        'padding-top',
        'margin-bottom',
      ]),
    ).toEqual({
      'max-width': '650px',
      'min-height': '712px',
      'max-height': '800px',
      'padding-top': '0px',
      'margin-bottom': '64px',
    });
  });

  test('toolbar, buttons and labels', async ({ page }) => {
    await open(page, 'mode=inline');
    expect(
      await styles(toolbar(page), [
        'background-color',
        'color',
        'border-top-left-radius',
        'min-height',
        'padding-left',
        'padding-right',
        'margin-bottom',
        'justify-content',
      ]),
    ).toEqual({
      'background-color': 'rgb(84, 100, 110)',
      color: 'rgb(255, 255, 255)',
      'border-top-left-radius': '8px',
      'min-height': '48px',
      'padding-left': '16px',
      'padding-right': '16px',
      'margin-bottom': '40px',
      'justify-content': 'space-between',
    });
    expect(await styles(page.locator('.rpv-toolbar-wrapper'), ['max-width'])).toEqual({
      'max-width': '482px',
    });
    expect(await styles(page.locator('.rpv-toolbar__group').first(), ['gap'])).toEqual({
      gap: '8px',
    });
    expect(
      await styles(page.locator('.rpv-toolbar__pages'), ['min-width', 'font-size', 'font-weight']),
    ).toEqual({ 'min-width': '80px', 'font-size': '14px', 'font-weight': '600' });
    expect(await styles(page.locator('.rpv-toolbar__zoom'), ['min-width'])).toEqual({
      'min-width': '40px',
    });
    const zoomOut = await button(page, 'Zoom out').boundingBox();
    expect([zoomOut?.width, zoomOut?.height]).toEqual([34, 34]);
    expect(await styles(button(page, 'Zoom out'), ['color'])).toEqual({
      color: 'rgb(255, 255, 255)',
    });
    expect(await styles(button(page, 'Previous page'), ['color'])).toEqual({
      color: 'rgba(255, 255, 255, 0.3)',
    });
  });

  test('page styling; 612 pt fits in 650 px at true size', async ({ page }) => {
    await open(page, 'mode=inline');
    expect(
      await styles(pageBox(page), [
        'background-color',
        'border-top-width',
        'border-top-style',
        'border-top-color',
        'border-top-left-radius',
        'box-shadow',
      ]),
    ).toEqual({
      'background-color': 'rgb(255, 255, 255)',
      'border-top-width': '1px',
      'border-top-style': 'solid',
      'border-top-color': 'rgb(221, 221, 221)',
      'border-top-left-radius': '4px',
      'box-shadow': 'rgba(0, 0, 0, 0.1) 0px 2px 8px 0px',
    });
    expect(await pageSize(page)).toEqual({ width: 612, height: 792 });
    // Centered horizontally in the viewport.
    const [container, box] = await Promise.all([
      viewport(page).boundingBox(),
      pageBox(page).boundingBox(),
    ]);
    if (!container || !box) throw new Error('missing boxes');
    expect(Math.abs(box.x - container.x - (container.width - box.width) / 2)).toBeLessThan(1.5);
  });

  test('control order and labels; toolbar below the page', async ({ page }) => {
    await open(page, 'mode=inline');
    const labels = await toolbar(page)
      .locator('button, .rpv-toolbar__label')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('aria-label') ?? element.textContent),
      );
    expect(labels).toEqual([
      'Zoom out',
      '100%',
      'Zoom in',
      'Previous page',
      '1 / 3',
      'Next page',
      'Enter fullscreen',
      'Rotate PDF',
      'Download PDF',
      'Print PDF',
    ]);
    const [page1, bar] = await Promise.all([
      pageBox(page).boundingBox(),
      toolbar(page).boundingBox(),
    ]);
    expect(bar && page1 && bar.y > page1.y + page1.height).toBe(true);
  });

  test('fullscreen viewport and root', async ({ page }) => {
    await open(page, 'mode=fullscreen');
    expect(await styles(viewport(page), ['max-width', 'max-height', 'padding-top'])).toEqual({
      'max-width': '100%',
      'max-height': '100%',
      'padding-top': '32px',
    });
    const root = await page.locator('.rpv-root').boundingBox();
    expect(root?.height).toBe(DESKTOP.height);
    expect(await styles(page.locator('.rpv-toolbar-wrapper'), ['max-width'])).toEqual({
      'max-width': '100%',
    });
  });

  test('loading shows a 40px spinner and the text, with the toolbar', async ({ page }) => {
    await page.goto('/#/harness?state=loading');
    const status = page.getByRole('status');
    await expect(status).toHaveText('Loading PDF...');
    // Layout size (the bounding box of a rotating element is larger).
    const spinner = await page
      .locator('.rpv-spinner')
      .evaluate((element) => [
        (element as HTMLElement).offsetWidth,
        (element as HTMLElement).offsetHeight,
      ]);
    expect(spinner).toEqual([40, 40]);
    expect(await styles(page.locator('.rpv-loading__text'), ['color'])).toEqual({
      color: 'rgba(0, 0, 0, 0.6)',
    });
    await expect(toolbar(page)).toBeVisible();
  });

  test('the error alert fills a 400px area', async ({ page }) => {
    await page.goto('/#/harness?state=error');
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    expect(await styles(alert, ['background-color', 'color', 'border-top-left-radius'])).toEqual({
      'background-color': 'rgb(253, 237, 237)',
      color: 'rgb(95, 33, 32)',
      'border-top-left-radius': '4px',
    });
    const area = await page.locator('.rpv-error').boundingBox();
    expect(area?.height).toBe(400);
  });
});

test.describe('layout — compact (390×844)', () => {
  test.use({ viewport: MOBILE });

  test('compact inline', async ({ page }) => {
    await open(page, 'mode=inline');
    expect(await styles(viewport(page), ['padding-top', 'min-height'])).toEqual({
      'padding-top': '16px',
      'min-height': '400px',
    });
    expect(await styles(page.locator('.rpv-toolbar__pages'), ['min-width'])).toEqual({
      'min-width': '40px',
    });
    await expect(toolbar(page).getByRole('button', { name: 'Rotate PDF' })).toHaveCount(0);
    await expect(toolbar(page).getByRole('button', { name: 'Print PDF' })).toHaveCount(0);
    // the page shrinks to the available width.
    const available = await viewport(page).evaluate((element) => element.clientWidth - 32);
    await expect.poll(async () => (await pageSize(page)).width).toBeLessThanOrEqual(available);
  });

  test('compact fullscreen', async ({ page }) => {
    await open(page, 'mode=fullscreen');
    expect(await styles(viewport(page), ['padding-top'])).toEqual({ 'padding-top': '32px' });
    // Nine controls do not fit 390px on one row: the actions collapse into the "More" menu.
    const more = button(page, 'More actions');
    await more.click();
    const menu = page.getByRole('menu', { name: 'More actions' });
    await expect(menu.getByRole('menuitem', { name: 'Rotate PDF' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Print PDF' })).toBeVisible();
    // The toolbar stays one row, inside the screen.
    const bar = await toolbar(page).boundingBox();
    expect(bar && bar.height).toBeLessThanOrEqual(48);
    expect(bar && bar.x >= 0 && bar.x + bar.width <= MOBILE.width).toBe(true);
  });

  test('the compact breakpoint is 960px', async ({ page }) => {
    await page.setViewportSize({ width: 959, height: 800 });
    await open(page, 'mode=inline');
    await expect(page.locator('.rpv-root')).toHaveAttribute('data-compact', '');
    await page.setViewportSize({ width: 960, height: 800 });
    await expect(page.locator('.rpv-root')).not.toHaveAttribute('data-compact');
  });
});
