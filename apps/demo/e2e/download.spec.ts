import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { button, countRequests, openView } from './helpers';

test.describe('download', () => {
  test('U-10 / KI-11: saves the loaded bytes under the derived name, without refetching', async ({
    page,
  }) => {
    const requests = countRequests(page, 'letter-3pages.pdf');
    await openView(page, { src: '/samples/letter-3pages.pdf' });
    const downloading = page.waitForEvent('download');
    await button(page, 'Download PDF').click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('letter-3pages.pdf');
    const bytes = await readFile(await download.path());
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(requests.count).toBe(1);
  });
});
