import { expect, test } from '@playwright/test';
import { button, openView, rendered } from './helpers';

interface PrintRecord {
  images: number;
}

test.describe('print', () => {
  test('renders every page into a hidden iframe and calls print()', async ({ page }) => {
    // Runs in every frame, including the print iframe: record the call instead of printing.
    await page.addInitScript(() => {
      window.print = () => {
        const top = window.top as Window & { __prints?: PrintRecord[] };
        (top.__prints ??= []).push({ images: document.images.length });
        window.dispatchEvent(new Event('afterprint'));
      };
    });
    await openView(page, { src: '/samples/letter-3pages.pdf' });
    await button(page, 'Print PDF').click();
    await expect
      .poll(() => page.evaluate(() => (window as Window & { __prints?: PrintRecord[] }).__prints))
      .toEqual([{ images: 3 }]);
    await expect(page.locator('iframe.rpv-print-frame')).toHaveCount(0);
  });

  test('printMode "open-url" opens the document in a new tab', async ({ page }) => {
    // Headless browsers download a PDF opened in a tab; record the call instead.
    await page.addInitScript(() => {
      window.open = (...args: unknown[]) => {
        (window as Window & { __opened?: unknown[] }).__opened = args;
        return null;
      };
    });
    await page.goto('/#/');
    await rendered(page);
    await page.getByLabel('Print mode').selectOption('open-url');
    await button(page, 'Print PDF').click();
    await expect
      .poll(() => page.evaluate(() => (window as Window & { __opened?: unknown[] }).__opened))
      .toEqual([
        expect.stringContaining('/samples/letter-3pages.pdf'),
        '_blank',
        'noopener,noreferrer',
      ]);
  });
});
