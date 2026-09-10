import { expect, type Page } from '@playwright/test';

export const DESKTOP = { width: 1280, height: 800 };
export const MOBILE = { width: 390, height: 844 };

export const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'PDF controls' });
export const button = (page: Page, name: string) =>
  toolbar(page).getByRole('button', { name, exact: true });
export const pageLabel = (page: Page) => toolbar(page).locator('.rpv-toolbar__pages');
export const zoomLabel = (page: Page) => toolbar(page).locator('.rpv-toolbar__zoom');
export const pageBox = (page: Page) => page.locator('.rpv-page');
export const viewport = (page: Page) => page.locator('.rpv-viewport');

/** Waits until a page has finished rendering (the canvas is swapped in only when complete). */
export async function rendered(page: Page) {
  await expect(page.locator('.rpv-page canvas')).toBeAttached();
}

/** Opens the standalone viewer with query parameters and waits for the first render. */
export async function openView(page: Page, params: Record<string, string>) {
  await page.goto(`/#/view?${new URLSearchParams(params).toString()}`);
  await rendered(page);
}

/** CSS width/height the renderer assigned to the page box. */
export async function pageSize(page: Page) {
  return pageBox(page).evaluate((element) => ({
    width: Number.parseFloat((element as HTMLElement).style.width),
    height: Number.parseFloat((element as HTMLElement).style.height),
  }));
}

/** Counts requests for a file name. */
export function countRequests(page: Page, fileName: string) {
  const counter = { count: 0 };
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith(fileName)) counter.count += 1;
  });
  return counter;
}
