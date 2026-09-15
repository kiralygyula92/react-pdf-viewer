/**
 * Opt-in features, driven through the playground's controls.
 */
import { expect, test, type Page } from '@playwright/test';
import { button, pageLabel, rendered, zoomLabel } from './helpers';

async function openSample(page: Page, name: RegExp) {
  await page.getByRole('tab', { name: 'Samples' }).click();
  await page.getByRole('button', { name }).click();
}

async function enable(page: Page, label: string) {
  await page.getByLabel(label, { exact: true }).check();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/react-pdf-viewer/demos/playground/');
  await rendered(page);
});

test.describe('opt-in features', () => {
  test('continuous layout keeps at most the visible pages + 2 canvases', async ({ page }) => {
    await openSample(page, /Long document, 40 pages/);
    await page.getByLabel('Layout').selectOption('continuous');
    await expect(page.locator('.rpv-page-slot')).toHaveCount(40);
    await rendered(page);

    const budget = () =>
      page.evaluate(() => {
        const viewport = document.querySelector('.rpv-viewport')?.getBoundingClientRect();
        if (!viewport) return { canvases: -1, visible: 0 };
        const visible = [...document.querySelectorAll('.rpv-page-slot')].filter((slot) => {
          const box = slot.getBoundingClientRect();
          return box.bottom > viewport.top && box.top < viewport.bottom;
        }).length;
        return { canvases: document.querySelectorAll('.rpv-page canvas').length, visible };
      });
    const withinBudget = async () => {
      const { canvases, visible } = await budget();
      return canvases >= 1 && canvases <= visible + 2;
    };
    await expect.poll(withinBudget).toBe(true);

    await page.locator('.rpv-viewport').evaluate((element) => {
      element.scrollTop = element.scrollHeight / 2;
    });
    await expect(pageLabel(page)).not.toHaveText('1 / 40');
    await expect.poll(withinBudget).toBe(true);

    // Toolbar navigation scrolls the list.
    await button(page, 'Next page').click();
    await expect.poll(withinBudget).toBe(true);
  });

  test('search highlights matches and steps through them', async ({ page }) => {
    await openSample(page, /Long document, 40 pages/);
    await enable(page, 'Search');
    await page.getByRole('searchbox', { name: 'Search in document' }).fill('viewer');
    await expect(page.locator('.rpv-search__status')).toHaveText(/^1 of \d+$/);
    await expect(page.locator('.textLayer .highlight.selected')).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search in document' }).press('Enter');
    await expect(page.locator('.rpv-search__status')).toHaveText(/^2 of \d+$/);
  });

  test('the text layer carries the page text', async ({ page }) => {
    await enable(page, 'Text layer');
    await expect(page.locator('.textLayer')).toContainText('Page 1 of 3');
  });

  test('links navigate internally and open externally in a safe new tab', async ({ page }) => {
    await enable(page, 'Links (annotation layer)');
    await openSample(page, /Internal and external links/);
    const external = page.locator('.annotationLayer a[href="https://mozilla.github.io/pdf.js/"]');
    await expect(external).toHaveAttribute('target', '_blank');
    await expect(external).toHaveAttribute('rel', /noopener/);
    await page.locator('.annotationLayer a[href="#"]').first().click();
    await expect(pageLabel(page)).toHaveText('2 / 2');
  });

  test('password prompt unlocks the encrypted sample', async ({ page }) => {
    await enable(page, 'Password prompt');
    await openSample(page, /Password protected/);
    const field = page.getByLabel('Password', { exact: true });
    await field.fill('nope');
    await field.press('Enter');
    await expect(page.getByRole('alert')).toContainText('Incorrect password');
    await page.getByLabel('Password', { exact: true }).fill('demo');
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByRole('img', { name: 'Page 1 of 1' })).toBeVisible();
  });

  test('thumbnails and page input navigate', async ({ page }) => {
    await enable(page, 'Thumbnails');
    await enable(page, 'Page number input');
    await page
      .getByRole('navigation', { name: 'Pages' })
      .getByRole('button', { name: 'Page 3 of 3' })
      .click();
    await expect(page.getByRole('textbox', { name: 'Page number' })).toHaveValue('3');
    await page.getByRole('textbox', { name: 'Page number' }).fill('2');
    await page.getByRole('textbox', { name: 'Page number' }).press('Enter');
    await expect(page.getByRole('img', { name: 'Page 2 of 3' })).toBeVisible();
  });

  test('Ctrl + wheel zooms and the zoom label resets it', async ({ page }) => {
    await enable(page, 'Ctrl/⌘ + wheel zoom');
    await enable(page, 'Zoom reset button');
    // Playwright's mouse.wheel does not reliably carry held modifiers; dispatch Ctrl + wheel.
    await page.locator('.rpv-page').evaluate((element) => {
      const box = element.getBoundingClientRect();
      element.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: -300,
          ctrlKey: true,
          clientX: box.x + box.width / 2,
          clientY: box.y + box.height / 3,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await expect
      .poll(async () => Number.parseInt((await zoomLabel(page).textContent()) ?? '0', 10))
      .toBeGreaterThan(100);
    await zoomLabel(page).click();
    await expect(zoomLabel(page)).toHaveText('100%');
  });
});
