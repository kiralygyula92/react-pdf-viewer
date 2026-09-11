import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PdfViewer } from '../src/PdfViewer';
import type { PdfViewerProps } from '../src/types';
import { installMockPdfjs } from './pdfjsMock';

const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

/**
 * jsdom has no layout. Stub the two measurements the toolbar uses: the viewer's width and each
 * group's width (the actions group shrinks to 50px once it only holds the "More" button).
 */
function stubLayout(available: number, groupWidth = 150) {
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
    return this.classList.contains('rpv-root') ? available : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (!this.classList.contains('rpv-toolbar__group')) return 0;
    return this.querySelector('[data-action="more"]') && this.children.length === 1
      ? 50
      : groupWidth;
  });
}

async function renderViewer(props: Partial<PdfViewerProps> = {}) {
  installMockPdfjs({ autoResolveDocument: true, autoResolveRender: true });
  const user = userEvent.setup();
  render(<PdfViewer source={BYTES} {...props} />);
  await screen.findByRole('img', { name: 'Page 1 of 3' });
  return { user, toolbar: screen.getByRole('toolbar', { name: 'PDF controls' }) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('responsive toolbar', () => {
  it('keeps the original single row when everything fits', async () => {
    stubLayout(1000);
    const { toolbar } = await renderViewer();
    expect(within(toolbar).queryByRole('button', { name: 'More actions' })).toBeNull();
    expect(within(toolbar).getByRole('button', { name: 'Print PDF' })).toBeInTheDocument();
  });

  it('collapses the actions into an accessible "More actions" menu when space runs out', async () => {
    stubLayout(400);
    const onRotationChange = vi.fn();
    const { user, toolbar } = await renderViewer({ onRotationChange });
    expect(within(toolbar).queryByRole('button', { name: 'Print PDF' })).toBeNull();
    expect(within(toolbar).getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();

    const more = within(toolbar).getByRole('button', { name: 'More actions' });
    expect(more).toHaveAttribute('aria-haspopup', 'menu');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);
    const menu = screen.getByRole('menu', { name: 'More actions' });
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Enter fullscreen', 'Rotate PDF', 'Download PDF', 'Print PDF']);
    expect(within(menu).getByRole('menuitem', { name: 'Enter fullscreen' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(within(menu).getByRole('menuitem', { name: 'Rotate PDF' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(within(menu).getByRole('menuitem', { name: 'Print PDF' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(within(menu).getByRole('menuitem', { name: 'Enter fullscreen' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(more).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    await user.click(screen.getByRole('menuitem', { name: 'Rotate PDF' }));
    expect(onRotationChange).toHaveBeenCalledWith(90);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(more).toHaveFocus();
  });

  it('closes the menu on an outside click', async () => {
    stubLayout(400);
    const { user, toolbar } = await renderViewer();
    await user.click(within(toolbar).getByRole('button', { name: 'More actions' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('moves the zoom controls into the menu too when space is tighter still', async () => {
    stubLayout(250);
    const onScaleChange = vi.fn();
    const { user, toolbar } = await renderViewer({ onScaleChange });
    expect(within(toolbar).queryByRole('button', { name: 'Zoom in' })).toBeNull();
    expect(within(toolbar).getByRole('button', { name: 'Next page' })).toBeInTheDocument();
    await user.click(within(toolbar).getByRole('button', { name: 'More actions' }));
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Zoom out',
      'Reset zoom (100%)',
      'Zoom in',
      'Enter fullscreen',
      'Rotate PDF',
      'Download PDF',
      'Print PDF',
    ]);
    await user.click(screen.getByRole('menuitem', { name: 'Zoom in' }));
    expect(onScaleChange).toHaveBeenCalledWith(1.05);
  });

  it('the toolbar stays a single tab stop including the More button', async () => {
    stubLayout(400);
    const { user, toolbar } = await renderViewer();
    within(toolbar).getByRole('button', { name: 'Zoom out' }).focus();
    await user.keyboard('{End}');
    expect(within(toolbar).getByRole('button', { name: 'More actions' })).toHaveFocus();
    const tabbable = [...toolbar.querySelectorAll<HTMLElement>('[data-action]')].filter(
      (element) => element.tabIndex === 0,
    );
    expect(tabbable).toHaveLength(1);
  });
});
