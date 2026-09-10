import { expect, test } from '@playwright/test';

test('demo hello page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'React PDF Viewer' })).toBeVisible();
});
