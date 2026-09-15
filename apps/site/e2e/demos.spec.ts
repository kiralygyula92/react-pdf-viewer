import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Demo viewers are tall enough to show a whole page at 100% without scrolling. Checked on every
 * capability page, for each demo that renders a single-page layout at 100% zoom.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const nav = JSON.parse(
  readFileSync(resolve(repoRoot, 'content/react-pdf-viewer/nav.json'), 'utf8'),
) as NavNode[];

interface NavNode {
  pathname: string;
  capabilityId?: string;
  children?: NavNode[];
}

const capabilityPages = (nodes: NavNode[]): string[] =>
  nodes.flatMap((node) => [
    ...(node.capabilityId ? [node.pathname] : []),
    ...capabilityPages(node.children ?? []),
  ]);

test.describe('demo viewer size', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Layout check, one engine is enough');
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('a page at 100% fits the demo viewer without scrolling', async ({ page }) => {
    test.setTimeout(300_000);
    const pages = capabilityPages(nav);
    expect(pages.length).toBeGreaterThan(20);
    const checked: string[] = [];
    const overflowing: string[] = [];

    for (const pathname of pages) {
      await page.goto(pathname);
      const figures = page.locator('figure.ppds-demo');
      const count = await figures.count();
      for (let index = 0; index < count; index++) {
        const figure = figures.nth(index);
        await figure.scrollIntoViewIfNeeded();
        const canvas = figure.locator('.rpv-page canvas').first();
        const rendered = await canvas
          .waitFor({ state: 'attached', timeout: 8_000 })
          .then(() => true)
          .catch(() => false);
        if (!rendered) continue;
        // Headless demos render pages without the full viewer: there is no viewport to measure.
        const state = await canvas.evaluate((element) => {
          const root = element.closest('.rpv-root');
          const viewport = root?.querySelector<HTMLElement>('.rpv-viewport');
          return {
            layout: root?.getAttribute('data-layout') ?? null,
            zoom: root?.querySelector('.rpv-toolbar__zoom')?.textContent?.trim() ?? '',
            overflow: viewport ? viewport.scrollHeight - viewport.clientHeight : 0,
            title: element.closest('figure')?.getAttribute('aria-label') ?? '',
          };
        });
        if (state.layout !== 'single' || state.zoom !== '100%') continue;
        checked.push(`${pathname} ${state.title}`);
        if (state.overflow > 1) overflowing.push(`${pathname} ${state.title}: ${state.overflow}px`);
      }
    }

    expect(checked.length).toBeGreaterThan(20);
    expect(overflowing).toEqual([]);
  });
});
