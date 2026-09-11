import { expect, test, type Page } from '@playwright/test';

/** Every public `--rpv-*` custom property the loaded stylesheets read or set. */
function stylesheetVariables(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const names = new Set<string>();
    const visit = (rules: CSSRuleList) => {
      for (const rule of rules) {
        for (const match of rule.cssText.matchAll(/--rpv-[a-z0-9-]+/g)) names.add(match[0]);
        if (rule instanceof CSSGroupingRule) visit(rule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) visit(sheet.cssRules);
    return [...names].sort();
  });
}

test.describe('documentation page', () => {
  test('documents exactly the --rpv-* variables the viewer stylesheet uses', async ({ page }) => {
    await page.goto('/#/docs');
    await expect(page.getByRole('heading', { level: 1, name: 'Documentation' })).toBeVisible();
    const used = await stylesheetVariables(page);
    const documented = await page
      .locator('[data-css-var]')
      .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-css-var')));
    expect(used.length).toBeGreaterThan(40);
    expect(
      used.filter((name) => !documented.includes(name)),
      'undocumented',
    ).toEqual([]);
    expect(
      documented.filter((name) => !used.includes(name ?? '')),
      'stale',
    ).toEqual([]);
  });

  test('deep links open a section and the contents track it', async ({ page }) => {
    await page.goto('/#/docs?s=theming');
    await expect(page.getByRole('heading', { level: 2, name: 'Theming' })).toBeInViewport();
    const contents = page.getByRole('navigation', { name: 'Documentation' });
    await expect(contents.getByRole('link', { name: 'Theming' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await contents.getByRole('link', { name: 'Imperative API' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Imperative API' })).toBeInViewport();
    await expect(page).toHaveURL(/#\/docs\?s=api$/);

    // A hash change while the page is open (a pasted link, Back / Forward) also navigates.
    await page.goto('/#/docs?s=errors');
    await expect(page.getByRole('heading', { level: 2, name: 'Errors' })).toBeInViewport();
  });

  test('on phones, tables stack into cards and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/docs?s=props');
    await expect(page.getByRole('heading', { level: 2, name: 'PdfViewer props' })).toBeInViewport();
    const overflowing = await page.evaluate(() =>
      [
        document.documentElement,
        ...document.querySelectorAll<HTMLElement>('.demo-table-wrap, .demo-code pre'),
      ]
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .map((element) => element.textContent.slice(0, 60)),
    );
    expect(overflowing).toEqual([]);
  });

  test('the filter narrows every reference table', async ({ page }) => {
    await page.goto('/#/docs');
    await page.getByRole('searchbox', { name: 'Filter the reference' }).fill('zoomReset');
    // Name cells also carry their badge ("zoomReset opt-in"), so match the start of the name.
    await expect(page.getByRole('cell', { name: /^zoomReset\b/ }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: /^source\b/ })).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText(/\d+ match/);

    // A link to a section the filter hides wins over the filter instead of scrolling to nothing.
    await page.goto('/#/docs?s=security');
    await expect(page.getByRole('heading', { level: 2, name: 'Security' })).toBeInViewport();
    await expect(page.getByRole('searchbox', { name: 'Filter the reference' })).toHaveValue('');
  });
});
