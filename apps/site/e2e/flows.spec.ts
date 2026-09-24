import { expect, test, type Page } from '@playwright/test';

/**
 * The required user flows, clicked through as a visitor would. Each step clicks a real
 * link on the page, so a broken or missing link fails the flow. F6 (Convert) does not apply: the
 * plugin is free only.
 */
const DOCS = 'React PDF Viewer documentation';

const article = (page: Page) => page.locator('article.ppds-article');
const sidebar = (page: Page) => page.getByRole('navigation', { name: DOCS });

/** Sidebar sections are collapsed unless they hold the current page; open one like a visitor. */
async function sidebarSection(page: Page, title: string) {
  const section = sidebar(page).locator('details', {
    has: page.locator('summary', { hasText: title }),
  });
  if ((await section.getAttribute('open')) === null) await section.locator('summary').click();
  return section;
}

async function follow(page: Page, link: ReturnType<Page['getByRole']>, pathname: string) {
  await link.first().click();
  await expect(page).toHaveURL(
    (url) => url.pathname + url.hash === pathname || url.pathname === pathname,
  );
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test.describe('required flows', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Flows are structural, not browser-specific',
  );

  test('F1 Evaluate: root → overview → features index → capability → back to docs → install', async ({
    page,
  }) => {
    // Docs-only site: the root redirects to the overview; no pricing.
    await page.goto('/');
    await expect(page).toHaveURL(/\/react-pdf-viewer\/$/);
    await follow(
      page,
      (await sidebarSection(page, 'Features')).getByRole('link', { name: 'All features' }),
      '/react-pdf-viewer/all-features/',
    );
    await follow(
      page,
      article(page).getByRole('link', { name: 'Search', exact: true }),
      '/react-pdf-viewer/search/',
    );
    await follow(
      page,
      page.getByRole('banner').getByRole('link', { name: 'React PDF Viewer', exact: true }),
      '/react-pdf-viewer/',
    );
    await follow(
      page,
      (await sidebarSection(page, 'Getting started')).getByRole('link', { name: 'Installation' }),
      '/react-pdf-viewer/getting-started/installation/',
    );
  });

  test('narrow screens: the header menu button opens the sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/react-pdf-viewer/zoom/');
    const menu = page.getByRole('banner').getByRole('button', { name: 'Documentation menu' });
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(sidebar(page)).toBeHidden();

    // Opens over the page, which can then be neither scrolled nor reached with Tab.
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(sidebar(page)).toBeVisible();
    await expect(sidebar(page).getByRole('link', { name: 'Zoom' })).toBeInViewport();
    expect(await page.locator('main').evaluate((main: HTMLElement) => main.inert)).toBe(true);

    // Esc closes it and returns focus to the button.
    await page.keyboard.press('Escape');
    await expect(sidebar(page)).toBeHidden();
    await expect(menu).toBeFocused();
    expect(await page.locator('main').evaluate((main: HTMLElement) => main.inert)).toBe(false);

    await menu.click();
    await follow(
      page,
      (await sidebarSection(page, 'Getting started')).getByRole('link', { name: 'Support' }),
      '/react-pdf-viewer/getting-started/support/',
    );
    await expect(menu).toHaveAttribute('aria-expanded', 'false');

    // The header fits the smallest phones without scrolling sideways.
    await page.setViewportSize({ width: 360, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    // Wide screens show the sidebar beside the page, and no menu button.
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(menu).toBeHidden();
    await expect(sidebar(page)).toBeVisible();
  });

  test('F2 Adopt: overview → installation → usage → first capability', async ({ page }) => {
    await page.goto('/react-pdf-viewer/');
    await follow(
      page,
      article(page).getByRole('link', { name: /Installation/ }),
      '/react-pdf-viewer/getting-started/installation/',
    );
    await expect(article(page).getByRole('heading', { name: 'Minimal example' })).toBeVisible();
    await follow(
      page,
      article(page).getByRole('link', { name: 'Usage' }),
      '/react-pdf-viewer/getting-started/usage/',
    );
    await follow(
      page,
      article(page).getByRole('link', { name: 'Controlled state' }),
      '/react-pdf-viewer/controlled-state/',
    );
  });

  test('F3 Implement: search → capability → demo source → reference → back', async ({ page }) => {
    await page.goto('/react-pdf-viewer/getting-started/usage/');
    await page.getByRole('button', { name: /Search/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Search the documentation' });
    await dialog.getByRole('textbox').fill('rotation');
    await follow(
      page,
      dialog.locator('a.pagefind-ui__result-link', { hasText: 'Rotation' }),
      '/react-pdf-viewer/rotation/',
    );
    const demo = page.getByRole('figure').first();
    await demo.getByRole('button', { name: 'Show source' }).click();
    await expect(demo.getByRole('region')).toContainText('PdfViewer');
    await follow(
      page,
      article(page).getByRole('link', { name: 'PdfViewerProps' }),
      '/react-pdf-viewer/api/pdf-viewer-props/',
    );
    await page.goBack();
    await expect(page).toHaveURL(/\/react-pdf-viewer\/rotation\/$/);
  });

  test('F4 Customise: capability Customization → customization guide → theming → CSS variables', async ({
    page,
  }) => {
    await page.goto('/react-pdf-viewer/zoom/');
    await follow(
      page,
      article(page).getByRole('link', { name: 'customization guide' }),
      '/react-pdf-viewer/customization/',
    );
    await follow(
      page,
      article(page).getByRole('link', { name: 'Theming', exact: true }),
      '/react-pdf-viewer/customization/theming/',
    );
    await follow(
      page,
      article(page).getByRole('link', { name: 'CSS variables' }),
      '/react-pdf-viewer/api/css-variables/',
    );
  });

  test('F5 Upgrade: version selector → Versions → Migration → changelog', async ({ page }) => {
    await page.goto('/react-pdf-viewer/zoom/');
    await page
      .getByRole('combobox', { name: 'Documentation version' })
      .selectOption({ label: 'All versions…' });
    await expect(page).toHaveURL(/\/react-pdf-viewer\/getting-started\/versions\/$/);
    await follow(
      page,
      article(page).getByRole('link', { name: 'Migration' }),
      '/react-pdf-viewer/migration/',
    );
    await follow(
      page,
      article(page).getByRole('link', { name: 'changelog' }),
      '/react-pdf-viewer/discover-more/changelog/',
    );
    await expect(page.getByRole('heading', { name: /^1\.0\.0/ })).toBeVisible();
  });

  test('F7 Support: any docs page → Support → free channel', async ({ page }) => {
    await page.goto('/react-pdf-viewer/zoom/');
    await follow(
      page,
      (await sidebarSection(page, 'Getting started')).getByRole('link', { name: 'Support' }),
      '/react-pdf-viewer/getting-started/support/',
    );
    await expect(article(page).getByRole('link', { name: 'issue' }).first()).toHaveAttribute(
      'href',
      'https://github.com/kiralygyula92/react-pdf-viewer/issues/new/choose',
    );
  });

  test('F8 Agent: llms.txt → every Markdown twin', async ({ request, baseURL }) => {
    const llms = await request.get('/react-pdf-viewer/llms.txt');
    expect(llms.ok()).toBe(true);
    const urls = [...(await llms.text()).matchAll(/\]\((https?:\/\/[^)]+\.md)\)/g)].map(
      (match) => new URL(match[1] ?? '').pathname,
    );
    expect(urls.length).toBeGreaterThan(80);
    for (const pathname of urls) {
      const twin = await request.get(new URL(pathname, baseURL).toString());
      expect(twin.ok(), pathname).toBe(true);
      expect(await twin.text(), pathname).toMatch(/^# /);
    }
  });

  test('F8 Agent: sidebar → AI context → the whole documentation in one file', async ({
    page,
    request,
  }) => {
    await page.goto('/react-pdf-viewer/zoom/');
    await follow(
      page,
      (await sidebarSection(page, 'Getting started')).getByRole('link', { name: 'AI context' }),
      '/react-pdf-viewer/getting-started/ai-context/',
    );
    await expect(article(page).locator('pre').first()).toContainText(
      /curl -o docs\/react-pdf-viewer\.md https?:\/\/\S+\/react-pdf-viewer\/llms-full\.md/,
    );
    const href = await article(page)
      .getByRole('link', { name: 'llms-full.md' })
      .first()
      .getAttribute('href');
    expect(href).toBe('/react-pdf-viewer/llms-full.md');

    // Markdown, not the application shell, and the same bytes under the name tools look for.
    const response = await request.get(href ?? '');
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('text/markdown');
    const full = await response.text();
    expect(full).toMatch(/^# React PDF Viewer — the complete documentation\n/);
    expect(await (await request.get('/react-pdf-viewer/llms-full.txt')).text()).toBe(full);

    // Every page llms.txt lists, the API reference included.
    const llms = await (await request.get('/react-pdf-viewer/llms.txt')).text();
    const pages = [...llms.matchAll(/^- \[[^\]]+\]\((https?:\/\/[^)]+)\.md\):/gm)].map(
      (match) => `${match[1] ?? ''}/`,
    );
    expect(pages.length).toBeGreaterThan(80);
    for (const url of pages) expect(full, url).toContain(` · ${url}\n`);

    // Every example as its code, none left as a bare name or with its JSX stripped.
    expect(full).toContain(
      '*Example: Default zoom controls* — the source of the live demo on this page.\n\n```tsx\n',
    );
    expect(full).toContain('return <PdfViewer source="/samples/letter-3pages.pdf" />;');
    expect(full).not.toMatch(/<Demo\b|return ;/);
  });
});
