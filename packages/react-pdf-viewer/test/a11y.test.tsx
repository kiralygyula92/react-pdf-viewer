import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PdfViewer } from '../src/PdfViewer';
import { stubMatchMedia } from './helpers';
import { installMockPdfjs } from './pdfjsMock';

const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

async function violations(container: HTMLElement) {
  // Color contrast needs real layout; it is covered by the Playwright axe suite.
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  return results.violations.map(
    ({ id, nodes }) => `${id}: ${nodes.map((n) => n.html).join(' | ')}`,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('accessibility (axe-core)', () => {
  const modes = [
    { name: 'desktop inline', compact: false, fullscreen: false },
    { name: 'desktop fullscreen', compact: false, fullscreen: true },
    { name: 'compact inline', compact: true, fullscreen: false },
    { name: 'compact fullscreen', compact: true, fullscreen: true },
  ];

  it.each(modes)('KI-22: no violations — $name', async ({ compact, fullscreen }) => {
    installMockPdfjs({ autoResolveDocument: true, autoResolveRender: true });
    stubMatchMedia(compact);
    const { container } = render(<PdfViewer source={BYTES} fullscreen={fullscreen} />);
    await screen.findByRole('img', { name: 'Page 1 of 3' });
    expect(await violations(container)).toEqual([]);
  });

  it('KI-22: no violations while loading, on error and when empty', async () => {
    installMockPdfjs();
    const loading = render(<PdfViewer source={BYTES} />);
    expect(await violations(loading.container)).toEqual([]);
    loading.unmount();

    const failing = render(
      <PdfViewer
        source="/missing.pdf"
        fetcher={() =>
          Promise.resolve(new Response(null, { status: 404, statusText: 'Not Found' }))
        }
      />,
    );
    await screen.findByRole('alert');
    expect(await violations(failing.container)).toEqual([]);
    failing.unmount();

    const empty = render(<PdfViewer source={null} />);
    expect(await violations(empty.container)).toEqual([]);
  });
});
