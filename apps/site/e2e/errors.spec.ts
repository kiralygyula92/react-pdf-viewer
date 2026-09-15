import { expect, test } from '@playwright/test';
import { toolbar } from './helpers';

const BLOCKED = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

test.describe('errors', () => {
  test('a 404 shows the alert with Retry and keeps the toolbar', async ({ page }) => {
    let requests = 0;
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/samples/missing.pdf') requests += 1;
    });
    await page.goto('/react-pdf-viewer/demos/document-viewer/?src=/samples/missing.pdf');
    await expect(page.getByRole('alert')).toContainText('Failed to fetch PDF: 404');
    await expect(toolbar(page)).toBeVisible();
    await expect(toolbar(page).getByRole('button', { name: 'Enter fullscreen' })).toBeEnabled();
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect.poll(() => requests).toBe(2);
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('a ProblemDetails 500 shows its detail', async ({ page }) => {
    await page.goto('/_internal/harness/?state=error');
    await expect(page.getByRole('alert')).toHaveText('The document could not be generated.');
  });

  test('a non-PDF response reports an invalid PDF', async ({ page }) => {
    await page.goto('/react-pdf-viewer/demos/document-viewer/?src=/samples/not-a-pdf.pdf');
    await expect(page.getByRole('alert')).toContainText(/invalid pdf/i);
  });

  test('a CORS-blocked URL reports a network error with the CORS explainer', async ({ page }) => {
    // Playwright adds CORS headers to fulfilled mocks, so emulate the browser blocking the
    // request instead (fetch rejects exactly as for a CORS failure; works offline).
    await page.route(BLOCKED, (route) => route.abort('accessdenied'));
    await page.goto('/react-pdf-viewer/demos/playground/');
    await page.getByRole('tab', { name: 'URL' }).click();
    await page.getByRole('button', { name: /no CORS headers/ }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('note')).toContainText('Access-Control-Allow-Origin');
    await expect(page.locator('[data-event="onError"]').first()).toContainText('NETWORK_ERROR');
  });
});
