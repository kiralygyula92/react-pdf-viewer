import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLinkService } from '../src/core/linkService';
import { buildPageText, findMatches, toItemSegments } from '../src/core/search';
import { PdfViewer } from '../src/PdfViewer';
import type { PdfViewerProps } from '../src/types';
import { stubResizeObserver } from './helpers';
import {
  createMockDocument,
  installMockPdfjs,
  LETTER,
  PasswordException,
  type MockPageSpec,
} from './pdfjsMock';

const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

const TEXT_PAGES: MockPageSpec[] = [
  { ...LETTER, text: ['Alpha ', 'beta gamma'] },
  { ...LETTER, text: ['Nothing here'] },
  { ...LETTER, text: ['Second ', 'Beta', ' match'] },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function renderViewer(props: Partial<PdfViewerProps> = {}, pages?: MockPageSpec[]) {
  installMockPdfjs({ autoResolveDocument: true, autoResolveRender: true, pages });
  const user = userEvent.setup();
  const utils = render(<PdfViewer source={BYTES} {...props} />);
  await screen.findByRole(
    props.textLayer || props.search || props.annotationLayer ? 'group' : 'img',
    {
      name: /^Page 1 of \d+$/,
    },
  );
  return { user, ...utils };
}

const toolbar = () => screen.getByRole('toolbar', { name: 'PDF controls' });
const zoomText = () => toolbar().querySelector('.rpv-toolbar__zoom')?.textContent;

describe('search core', () => {
  it('finds case-insensitive matches across items and maps them back to items', () => {
    const page = buildPageText([
      { str: 'Hello ' },
      { str: 'Wor', hasEOL: false },
      { str: 'ld', hasEOL: true },
      { str: 'hello' },
    ]);
    expect(page.text).toBe('Hello World hello');
    const matches = findMatches(page, 'HELLO');
    expect(matches).toEqual([
      { start: 0, end: 5 },
      { start: 12, end: 17 },
    ]);
    expect(toItemSegments(page, { start: 6, end: 11 })).toEqual([
      { item: 1, start: 0, end: 3 },
      { item: 2, start: 0, end: 2 },
    ]);
    expect(findMatches(page, '   ')).toEqual([]);
  });

  it('the link service resolves destinations and named actions', async () => {
    const { proxy, document } = createMockDocument({ numPages: 5 });
    const goToPage = vi.fn();
    const service = createLinkService(proxy, { goToPage, getPage: () => 2 });
    service.goToDestination([{ pageIndex: 3 }, { name: 'XYZ' }]);
    await waitFor(() => expect(goToPage).toHaveBeenCalledWith(4));
    document.getDestination.mockResolvedValueOnce([{ pageIndex: 1 }]);
    service.goToDestination('chapter-2');
    await waitFor(() => expect(goToPage).toHaveBeenCalledWith(2));
    service.executeNamedAction('NextPage');
    service.executeNamedAction('LastPage');
    expect(goToPage.mock.calls.slice(-2)).toEqual([[3], [5]]);

    // An unresolvable destination is ignored, without an unhandled rejection.
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    document.getDestination.mockRejectedValueOnce(new Error('Document destroyed'));
    service.goToDestination('gone');
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
    expect(goToPage).toHaveBeenCalledTimes(4);

    const link = window.document.createElement('a');
    service.addLinkAttributes(link, 'https://example.com/');
    expect([link.target, link.rel]).toEqual(['_blank', 'noopener noreferrer nofollow']);
  });
});

describe('opt-in features', () => {
  it('page-number input navigates on Enter', async () => {
    const { user } = await renderViewer({ pageInput: true });
    const input = within(toolbar()).getByRole('textbox', { name: 'Page number' });
    expect(input).toHaveValue('1');
    await user.clear(input);
    await user.type(input, '3{Enter}');
    expect(await screen.findByRole('img', { name: 'Page 3 of 3' })).toBeInTheDocument();
    expect(input).toHaveValue('3');
    // Out-of-range input is clamped.
    await user.clear(input);
    await user.type(input, '99{Enter}');
    expect(input).toHaveValue('3');
  });

  it('zoom label button resets zoom; preset ladder steps between levels', async () => {
    const { user } = await renderViewer({ zoomReset: true, zoomLevels: [0.5, 1, 2, 4] });
    await user.click(within(toolbar()).getByRole('button', { name: 'Zoom in' }));
    expect(zoomText()).toBe('200%');
    await user.click(within(toolbar()).getByRole('button', { name: 'Reset zoom (200%)' }));
    expect(zoomText()).toBe('100%');
    await user.click(within(toolbar()).getByRole('button', { name: 'Zoom out' }));
    expect(zoomText()).toBe('50%');
  });

  it('fitMode "width" fills the available width at the default scale', async () => {
    stubResizeObserver(1224, 800);
    const onPageRender = vi.fn();
    await renderViewer({ fitMode: 'width', onPageRender });
    await waitFor(() =>
      expect(onPageRender).toHaveBeenLastCalledWith(expect.objectContaining({ scale: 2 })),
    );
  });

  it('Ctrl + wheel zooms (and a plain wheel does not)', async () => {
    const onScaleChange = vi.fn();
    await renderViewer({ wheelZoom: true, onScaleChange });
    const viewport = screen.getByRole('group', { name: 'Document' });
    fireEvent.wheel(viewport, { deltaY: -100 });
    expect(onScaleChange).not.toHaveBeenCalled();
    fireEvent.wheel(viewport, { deltaY: -100, ctrlKey: true });
    expect(onScaleChange).toHaveBeenCalledWith(expect.any(Number));
    expect(onScaleChange.mock.calls[0]?.[0]).toBeGreaterThan(1);
  });

  it('the text layer exposes page text to assistive technology', async () => {
    await renderViewer({ textLayer: true }, TEXT_PAGES);
    const page = screen.getByRole('group', { name: 'Page 1 of 3' });
    await waitFor(() =>
      expect(page.querySelector('.textLayer')).toHaveTextContent('Alpha beta gamma'),
    );
  });

  it('search highlights matches and steps through pages', async () => {
    const { user } = await renderViewer({ search: true }, TEXT_PAGES);
    await user.type(screen.getByRole('searchbox', { name: 'Search in document' }), 'beta');
    await waitFor(() => expect(screen.getByText('1 of 2')).toBeInTheDocument());
    await waitFor(() =>
      expect(document.querySelector('.textLayer .highlight.selected')).toHaveTextContent('beta'),
    );
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('group', { name: 'Page 3 of 3' })).toBeInTheDocument();
    await waitFor(() =>
      expect(document.querySelector('.textLayer .highlight.selected')).toHaveTextContent('Beta'),
    );
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.querySelector('.textLayer .highlight')).toBeNull());
  });

  it('link annotations open external links safely and navigate internal ones', async () => {
    const pages: MockPageSpec[] = [
      {
        ...LETTER,
        annotations: [
          { subtype: 'Link', url: 'https://mozilla.github.io/pdf.js/', label: 'External' },
          { subtype: 'Link', dest: [{ pageIndex: 1 }], label: 'Internal' },
        ],
      },
      { ...LETTER },
    ];
    const { user } = await renderViewer({ annotationLayer: true }, pages);
    const external = await screen.findByRole('link', { name: 'External' });
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    // Links sit inside a group, never inside role="img" (axe nested-interactive).
    expect(screen.getByRole('group', { name: 'Page 1 of 2' })).toContainElement(external);
    expect(screen.queryByRole('img', { name: /^Page/ })).toBeNull();
    await user.click(screen.getByRole('link', { name: 'Internal' }));
    expect(await screen.findByRole('group', { name: 'Page 2 of 2' })).toBeInTheDocument();
  });

  it('password prompt asks again after a wrong password', async () => {
    const mock = installMockPdfjs({ autoResolveRender: true });
    const user = userEvent.setup();
    render(<PdfViewer source={BYTES} passwordPrompt />);
    await waitFor(() => expect(mock.loadingTasks).toHaveLength(1));
    act(() => mock.lastTask().reject(new PasswordException('No password given', 1)));
    const field = await screen.findByLabelText('Password');
    expect(screen.getByText('This document is password protected')).toBeInTheDocument();

    await user.type(field, 'wrong{Enter}');
    await waitFor(() => expect(mock.loadingTasks).toHaveLength(2));
    expect(mock.lastTask().params.password).toBe('wrong');
    act(() => mock.lastTask().reject(new PasswordException('Incorrect Password', 2)));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect password');

    await user.type(screen.getByLabelText('Password'), 'demo{Enter}');
    await waitFor(() => expect(mock.loadingTasks).toHaveLength(3));
    expect(mock.lastTask().params.password).toBe('demo');
    act(() => mock.lastTask().resolve());
    expect(await screen.findByRole('img', { name: 'Page 1 of 3' })).toBeInTheDocument();
  });

  it('continuous layout reserves every page but renders only a few', async () => {
    const { user, container } = await renderViewer({ layout: 'continuous' }, [
      ...Array.from({ length: 10 }, () => ({ ...LETTER })),
    ]);
    expect(container.querySelectorAll('.rpv-page-slot')).toHaveLength(10);
    expect(container.querySelectorAll('.rpv-page').length).toBeLessThanOrEqual(3);
    await user.click(within(toolbar()).getByRole('button', { name: 'Next page' }));
    expect(toolbar().querySelector('.rpv-toolbar__pages')).toHaveTextContent('2 / 10');
    expect(await screen.findByRole('img', { name: 'Page 3 of 10' })).toBeInTheDocument();
  });

  it('thumbnails navigate and mark the current page', async () => {
    const { user } = await renderViewer({ thumbnails: true });
    const nav = screen.getByRole('navigation', { name: 'Pages' });
    const third = within(nav).getByRole('button', { name: 'Page 3 of 3' });
    await user.click(third);
    expect(third).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('img', { name: 'Page 3 of 3' })).toBeInTheDocument();
  });

  it('thumbnails far from view are unmounted, and their placeholders keep the size', async () => {
    const observers: MockIntersectionObserver[] = [];
    class MockIntersectionObserver {
      targets: Element[] = [];
      constructor(readonly callback: IntersectionObserverCallback) {
        observers.push(this);
      }
      observe(target: Element) {
        this.targets.push(target);
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    // jsdom has no layout: give rendered pages a size to measure.
    const pageSize = (value: number) =>
      function (this: HTMLElement) {
        return this.classList.contains('rpv-page') ? value : 0;
      };
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(pageSize(114));
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(pageSize(149));
    await renderViewer(
      { thumbnails: true },
      Array.from({ length: 10 }, () => ({ ...LETTER })),
    );
    const nav = screen.getByRole('navigation', { name: 'Pages' });
    expect(nav.querySelectorAll('.rpv-page')).toHaveLength(8);
    await waitFor(() => expect(nav.querySelectorAll('canvas')).toHaveLength(8));
    const observer = observers.find((candidate) =>
      candidate.targets.some((target) => nav.contains(target)),
    );
    const entries = (observer?.targets ?? []).map(
      (target) =>
        ({
          target,
          isIntersecting: Number((target as HTMLElement).dataset['page']) <= 3,
        }) as IntersectionObserverEntry,
    );
    act(() => observer?.callback(entries, observer as unknown as IntersectionObserver));

    expect(nav.querySelectorAll('.rpv-page')).toHaveLength(3);
    // A released thumbnail keeps its size; one never rendered takes the latest rendered size.
    for (const pageNumber of [5, 10]) {
      const placeholder = nav.querySelector<HTMLElement>(
        `[data-page="${pageNumber}"] .rpv-thumbnail__placeholder`,
      );
      expect([placeholder?.style.width, placeholder?.style.height]).toEqual(['114px', '149px']);
    }
  });

  it('Shift + arrows are left to text selection', async () => {
    const { user } = await renderViewer({ textLayer: true }, TEXT_PAGES);
    screen.getByRole('group', { name: 'Document' }).focus();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(toolbar().querySelector('.rpv-toolbar__pages')).toHaveTextContent('1 / 3');
  });
});
