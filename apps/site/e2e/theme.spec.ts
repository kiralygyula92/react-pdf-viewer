import { expect, test } from '@playwright/test';

test.describe('theme toggle', () => {
  test.use({ colorScheme: 'dark' });

  test('shows the current theme and switches between moon and sun', async ({ page }) => {
    await page.goto('/react-pdf-viewer/');
    const toggle = page.getByRole('banner').getByRole('button', { name: 'Toggle dark mode' });
    const moon = toggle.locator('.ppds-theme-toggle__moon');
    const sun = toggle.locator('.ppds-theme-toggle__sun');

    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(moon).toBeVisible();
    await expect(sun).toBeHidden();

    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(sun).toBeVisible();
    await expect(moon).toBeHidden();

    // The choice persists across pages.
    await page.goto('/react-pdf-viewer/zoom/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('.ppds-theme-toggle__sun')).toBeVisible();

    await page.getByRole('banner').getByRole('button', { name: 'Toggle dark mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.ppds-theme-toggle__moon')).toBeVisible();
  });
});
