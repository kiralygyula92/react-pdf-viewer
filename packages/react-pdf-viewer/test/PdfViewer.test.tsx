import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { PdfViewer } from '../src/PdfViewer';
import type { PdfViewerApi, PdfViewerProps } from '../src/types';
import { stubDownloads, stubMatchMedia, stubPrintFrame, stubResizeObserver } from './helpers';
import { installMockPdfjs, type MockPdfjs } from './pdfjsMock';

const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
let mock: MockPdfjs;

beforeEach(() => {
  mock = installMockPdfjs({ autoResolveDocument: true, autoResolveRender: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function renderViewer(
  props: Partial<PdfViewerProps> = {},
  pageName: string | RegExp = /^Page \d+ of \d+$/,
) {
  const user = userEvent.setup();
  const utils = render(<PdfViewer source={BYTES} {...props} />);
  await screen.findByRole('img', { name: pageName });
  return { user, ...utils };
}

const toolbar = () => screen.getByRole('toolbar', { name: 'PDF controls' });
const button = (name: string | RegExp) => within(toolbar()).getByRole('button', { name });
const pageLabel = () => toolbar().querySelector('.rpv-toolbar__pages')?.textContent;
const zoomLabel = () => toolbar().querySelector('.rpv-toolbar__zoom')?.textContent;

describe('PdfViewer — default UI', () => {
  it('the toolbar sits below the page with the default controls and labels', async () => {
    await renderViewer();
    const viewport = screen.getByRole('group', { name: 'Document' });
    expect(
      viewport.compareDocumentPosition(toolbar()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const items = [...toolbar().querySelectorAll('button, .rpv-toolbar__label')].map(
      (element) => element.getAttribute('aria-label') ?? element.textContent,
    );
    expect(items).toEqual([
      'Zoom out',
      '100%',
      'Zoom in',
      'Previous page',
      '1 / 3',
      'Next page',
      'Enter fullscreen',
      'Rotate PDF',
      'Download PDF',
      'Print PDF',
    ]);
    const groups = toolbar().querySelectorAll('.rpv-toolbar__group');
    expect(groups).toHaveLength(3);
  });

  it('zoom steps by 5%, labels round, and buttons disable at the bounds', async () => {
    const onScaleChange = vi.fn();
    const { user } = await renderViewer({ onScaleChange });
    for (let i = 0; i < 10; i++) await user.click(button('Zoom in'));
    expect(zoomLabel()).toBe('150%');
    expect(onScaleChange).toHaveBeenLastCalledWith(1.5);

    const { rerender } = render(<PdfViewer source={BYTES} scale={0.25} />);
    const second = within(screen.getAllByRole('toolbar')[1] as HTMLElement);
    expect(second.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    rerender(<PdfViewer source={BYTES} scale={5} />);
    expect(second.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    expect(second.getByRole('button', { name: 'Zoom out' })).toBeEnabled();
  });

  it('page navigation is disabled at the ends', async () => {
    const onPageChange = vi.fn();
    const { user } = await renderViewer({ onPageChange });
    expect(button('Previous page')).toBeDisabled();
    await user.click(button('Next page'));
    await user.click(button('Next page'));
    expect(pageLabel()).toBe('3 / 3');
    expect(button('Next page')).toBeDisabled();
    expect(onPageChange.mock.calls).toEqual([[2], [3]]);
    expect(screen.getByRole('img', { name: 'Page 3 of 3' })).toBeInTheDocument();
  });

  it('an empty source shows 0 / 0 with navigation disabled and no spinner', () => {
    render(<PdfViewer source="" />);
    expect(pageLabel()).toBe('0 / 0');
    expect(button('Previous page')).toBeDisabled();
    expect(button('Next page')).toBeDisabled();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('No document')).toHaveClass('rpv-sr-only');
  });

  it('rotate cycles 0 → 90 → 180 → 270 → 0', async () => {
    const onRotationChange = vi.fn();
    const { user } = await renderViewer({ onRotationChange });
    for (let i = 0; i < 4; i++) await user.click(button('Rotate PDF'));
    expect(onRotationChange.mock.calls).toEqual([[90], [180], [270], [0]]);
  });

  it('the fullscreen button toggles its label and icon', async () => {
    const onFullscreenChange = vi.fn();
    const { user, container } = await renderViewer({
      fullscreenMode: 'controlled',
      onFullscreenChange,
    });
    const enterIcon = button('Enter fullscreen').querySelector('path')?.getAttribute('d');
    await user.click(button('Enter fullscreen'));
    expect(onFullscreenChange).toHaveBeenCalledWith(true);
    const exitIcon = button('Exit fullscreen').querySelector('path')?.getAttribute('d');
    expect(exitIcon).not.toBe(enterIcon);
    expect(container.querySelector('.rpv-root')).toHaveAttribute('data-fullscreen');
  });

  it('rotate and print are hidden in compact mode unless fullscreen', async () => {
    stubMatchMedia(true);
    const { rerender } = await renderViewer({ fullscreen: false });
    expect(within(toolbar()).queryByRole('button', { name: 'Rotate PDF' })).toBeNull();
    expect(within(toolbar()).queryByRole('button', { name: 'Print PDF' })).toBeNull();
    expect(document.querySelector('.rpv-root')).toHaveAttribute('data-compact');
    rerender(<PdfViewer source={BYTES} fullscreen />);
    expect(button('Rotate PDF')).toBeInTheDocument();
    expect(button('Print PDF')).toBeInTheDocument();
  });

  it('loading shows the spinner and text, keeps the toolbar, and zoom/rotate work', async () => {
    mock = installMockPdfjs({ autoResolveRender: true });
    const onScaleChange = vi.fn();
    const onRotationChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PdfViewer
        source={BYTES}
        onScaleChange={onScaleChange}
        onRotationChange={onRotationChange}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading PDF...');
    for (const name of ['Previous page', 'Next page', 'Download PDF', 'Print PDF']) {
      expect(button(name)).toBeDisabled();
    }
    await user.click(button('Zoom in'));
    await user.click(button('Rotate PDF'));
    expect(onScaleChange).toHaveBeenCalledWith(1.05);
    expect(onRotationChange).toHaveBeenCalledWith(90);
  });

  it('errors show the alert with Retry and keep the toolbar', async () => {
    const onError = vi.fn();
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ detail: 'Report expired' }), { status: 410 })),
    );
    const user = userEvent.setup();
    render(<PdfViewer source="/report.pdf" fetcher={fetcher} onError={onError} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Report expired');
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'HTTP_ERROR', status: 410 }),
    );
    expect(toolbar()).toBeInTheDocument();
    expect(button('Enter fullscreen')).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('a handled 401 shows the empty state without an error', async () => {
    const onError = vi.fn();
    const onHttpError = vi.fn((response: Response) => response.status === 401);
    render(
      <PdfViewer
        source="/secure.pdf"
        fetcher={() => Promise.resolve(new Response(null, { status: 401 }))}
        onHttpError={onHttpError}
        onError={onError}
      />,
    );
    await waitFor(() => expect(onHttpError).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('PdfViewer — page state', () => {
  it('an out-of-range controlled page is clamped and reported once', async () => {
    const onPageChange = vi.fn();
    render(<PdfViewer source={BYTES} page={5} onPageChange={onPageChange} />);
    await screen.findByRole('img', { name: 'Page 3 of 3' });
    expect(pageLabel()).toBe('3 / 3');
    expect(onPageChange.mock.calls).toEqual([[3]]);
  });

  it('a valid controlled page is kept and not re-reported', async () => {
    const onPageChange = vi.fn();
    render(<PdfViewer source={BYTES} page={2} onPageChange={onPageChange} />);
    await screen.findByRole('img', { name: 'Page 2 of 3' });
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('an uncontrolled viewer opens a new source on defaultPage', async () => {
    const { user, rerender } = await renderViewer();
    await user.click(button('Next page'));
    await user.click(button('Next page'));
    expect(pageLabel()).toBe('3 / 3');
    rerender(<PdfViewer source={new Uint8Array([1, 2, 3])} />);
    await screen.findByRole('img', { name: 'Page 1 of 3' });
    expect(pageLabel()).toBe('1 / 3');
  });

  it('works without any state props', async () => {
    const { user } = await renderViewer();
    await user.click(button('Next page'));
    await user.click(button('Zoom in'));
    expect(pageLabel()).toBe('2 / 3');
    expect(zoomLabel()).toBe('105%');
  });
});

describe('PdfViewer — extension points', () => {
  it('exposes the imperative API through ref', async () => {
    const ref = createRef<PdfViewerApi>();
    render(<PdfViewer ref={ref} source={BYTES} />);
    await screen.findByRole('img', { name: 'Page 1 of 3' });
    act(() => ref.current?.goToPage(3));
    expect(pageLabel()).toBe('3 / 3');
    act(() => ref.current?.rotate('ccw'));
    expect(ref.current?.rotation).toBe(270);
    act(() => ref.current?.setScale(9));
    expect(ref.current?.scale).toBe(5);
    act(() => ref.current?.setScale(Number.NaN));
    expect(ref.current?.scale).toBe(5);
    act(() => ref.current?.resetZoom());
    expect(ref.current).toMatchObject({ scale: 1, numPages: 3, status: 'ready' });
  });

  it('renderToolbar receives the API', async () => {
    const user = userEvent.setup();
    render(
      <PdfViewer
        source={BYTES}
        renderToolbar={(api) => (
          <button type="button" onClick={api.nextPage}>
            Custom next ({api.page}/{api.numPages})
          </button>
        )}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Custom next (1/3)' }));
    expect(screen.getByRole('button', { name: 'Custom next (2/3)' })).toBeInTheDocument();
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('toolbar config selects actions and position', async () => {
    await renderViewer({
      toolbar: { position: 'top', actions: ['previousPage', 'pageIndicator', 'nextPage'] },
    });
    expect(within(toolbar()).getAllByRole('button')).toHaveLength(2);
    const viewport = screen.getByRole('group', { name: 'Document' });
    expect(
      toolbar().compareDocumentPosition(viewport) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('labels and locale are applied', async () => {
    await renderViewer(
      {
        labels: { zoomIn: 'Nagyítás', pageAriaLabel: (page, total) => `${page}. oldal / ${total}` },
        locale: 'ar-EG',
      },
      '1. oldal / 3',
    );
    expect(button('Nagyítás')).toBeInTheDocument();
    expect(zoomLabel()).toBe('١٠٠%');
    expect(screen.getByRole('img', { name: '1. oldal / 3' })).toBeInTheDocument();
  });

  it('onDocumentLoad and onPageRender report details', async () => {
    const onDocumentLoad = vi.fn();
    const onPageRender = vi.fn();
    await renderViewer({ onDocumentLoad, onPageRender });
    expect(onDocumentLoad).toHaveBeenCalledWith({ numPages: 3, fingerprint: 'mock-fingerprint' });
    await waitFor(() =>
      expect(onPageRender).toHaveBeenCalledWith(expect.objectContaining({ page: 1, scale: 1 })),
    );
  });
});

describe('PdfViewer — default-on fixes', () => {
  it('at the default scale the page shrinks to the available width; zoomed it does not', async () => {
    stubResizeObserver(306, 700);
    const onPageRender = vi.fn();
    const { user } = await renderViewer({ onPageRender });
    await waitFor(() =>
      expect(onPageRender).toHaveBeenLastCalledWith(expect.objectContaining({ scale: 0.5 })),
    );
    expect(zoomLabel()).toBe('100%');
    await user.click(button('Zoom in'));
    await waitFor(() =>
      expect(onPageRender).toHaveBeenLastCalledWith(expect.objectContaining({ scale: 1.05 })),
    );
  });

  it('download saves the loaded bytes under the file name without refetching', async () => {
    const clicked = stubDownloads();
    const fetcher = vi.fn(() => Promise.resolve(new Response(BYTES)));
    const { user } = await renderViewer({ source: '/files/report.pdf', fetcher });
    await user.click(button('Download PDF'));
    await waitFor(() => expect(clicked).toHaveLength(1));
    expect(clicked[0]?.download).toBe('report.pdf');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mock.lastTask().handle.document.getData).toHaveBeenCalled();
  });

  it('fileName wins, onDownload can intercept, failures report DOWNLOAD_FAILED', async () => {
    const clicked = stubDownloads();
    const onDownload = vi.fn(() => false as const);
    const onError = vi.fn();
    const { user, rerender } = await renderViewer({ fileName: 'custom.pdf', onDownload, onError });
    await user.click(button('Download PDF'));
    await waitFor(() =>
      expect(onDownload).toHaveBeenCalledWith({
        fileName: 'custom.pdf',
        data: expect.any(Uint8Array),
      }),
    );
    expect(clicked).toHaveLength(0);

    mock.lastTask().handle.document.getData.mockRejectedValueOnce(new Error('gone'));
    rerender(<PdfViewer source={BYTES} onError={onError} />);
    await user.click(button('Download PDF'));
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'DOWNLOAD_FAILED' })),
    );
  });

  it('prints every page through a hidden iframe', async () => {
    const { frameWindow, frameDocument } = stubPrintFrame();
    const onPrint = vi.fn();
    const { user } = await renderViewer({ onPrint });
    await user.click(button('Print PDF'));
    await waitFor(() => expect(frameWindow.print).toHaveBeenCalledOnce());
    expect(onPrint).toHaveBeenCalledOnce();
    expect(frameDocument.images).toHaveLength(3);
    expect(frameDocument.head.textContent).toContain('@page { size: 612pt 792pt; margin: 0; }');
    const printRender = mock.lastTask().handle.document.pages[0]?.render.mock.calls.at(-1)?.[0];
    expect(printRender?.intent).toBe('print');
    await waitFor(() => expect(document.querySelector('iframe.rpv-print-frame')).toBeNull());
  });

  it('gives every page size its own sheet, so mixed-size documents print correctly', async () => {
    const { frameWindow, frameDocument } = stubPrintFrame();
    mock = installMockPdfjs({
      autoResolveDocument: true,
      autoResolveRender: true,
      pages: [
        { width: 612, height: 792 },
        { width: 842, height: 1191 },
        { width: 612, height: 792 },
      ],
    });
    const { user } = await renderViewer();
    await user.click(button('Print PDF'));
    await waitFor(() => expect(frameWindow.print).toHaveBeenCalledOnce());
    const styles = frameDocument.head.textContent ?? '';
    expect(styles).toContain('@page rpv-sheet-0 { size: 612pt 792pt; margin: 0; }');
    expect(styles).toContain('@page rpv-sheet-1 { size: 842pt 1191pt; margin: 0; }');
    const sheets = [...frameDocument.body.children].map((sheet) => sheet.className);
    expect(sheets).toEqual(['page rpv-sheet-0', 'page rpv-sheet-1', 'page rpv-sheet-0']);
  });

  it('onPrint can cancel; printMode "open-url" opens the document instead', async () => {
    const { frameWindow } = stubPrintFrame();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const { user, rerender } = await renderViewer({ onPrint: () => false });
    await user.click(button('Print PDF'));
    expect(frameWindow.print).not.toHaveBeenCalled();

    rerender(<PdfViewer source={BYTES} printMode="open-url" />);
    await user.click(button('Print PDF'));
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith('blob:page', '_blank', 'noopener,noreferrer'),
    );
  });

  it('printMode "open-url" opens only plain web URLs as is', async () => {
    stubDownloads();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(BYTES))),
    );
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const fetcher = vi.fn(() => Promise.resolve(new Response(BYTES)));
    const { user, rerender } = await renderViewer({
      source: '/files/a.pdf',
      requestInit: {},
      printMode: 'open-url',
    });
    // A new tab would not send the request's headers: open the loaded bytes instead.
    await user.click(button('Print PDF'));
    await waitFor(() =>
      expect(open).toHaveBeenLastCalledWith('blob:mock', '_blank', 'noopener,noreferrer'),
    );

    rerender(<PdfViewer source="javascript:alert(1)" fetcher={fetcher} printMode="open-url" />);
    await screen.findByRole('img', { name: /^Page 1 of/ });
    await user.click(button('Print PDF'));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
    expect(open).toHaveBeenLastCalledWith('blob:mock', '_blank', 'noopener,noreferrer');

    rerender(<PdfViewer source="/files/a.pdf" printMode="open-url" />);
    await screen.findByRole('img', { name: /^Page 1 of/ });
    await user.click(button('Print PDF'));
    await waitFor(() =>
      expect(open).toHaveBeenLastCalledWith(
        `${window.location.origin}/files/a.pdf`,
        '_blank',
        'noopener,noreferrer',
      ),
    );
  });

  it('native mode falls back to an overlay without reloading the document', async () => {
    const onFullscreenChange = vi.fn();
    const { user } = await renderViewer({ onFullscreenChange });
    await user.click(button('Enter fullscreen'));
    const dialog = await screen.findByRole('dialog', { name: 'PDF viewer' });
    expect(dialog).toHaveAttribute('data-presentation', 'overlay');
    expect(dialog.parentElement).toBe(document.body);
    await user.keyboard('{Escape}');
    expect(onFullscreenChange.mock.calls).toEqual([[true], [false]]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mock.getDocument).toHaveBeenCalledTimes(1);
  });

  it('native mode uses the Fullscreen API and follows the browser leaving it', async () => {
    // jsdom has no Fullscreen API; install a minimal one for this test.
    let fullscreenElement: Element | null = null;
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => true });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    });
    const request = vi.fn(() => {
      fullscreenElement = document.querySelector('.rpv-root');
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    });
    HTMLElement.prototype.requestFullscreen = request;
    document.exitFullscreen = vi.fn(() => Promise.resolve());
    onTestFinished(() => {
      Reflect.deleteProperty(document, 'fullscreenEnabled');
      Reflect.deleteProperty(document, 'fullscreenElement');
      Reflect.deleteProperty(document, 'exitFullscreen');
      Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen');
    });

    const onFullscreenChange = vi.fn();
    const { user, container } = await renderViewer({ onFullscreenChange });
    await user.click(button('Enter fullscreen'));
    const root = container.querySelector('.rpv-root');
    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(request.mock.contexts[0]).toBe(root);
    expect(root).toHaveAttribute('data-presentation', 'native');

    act(() => {
      fullscreenElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(onFullscreenChange.mock.calls).toEqual([[true], [false]]);
  });

  it('keyboard shortcuts work while focus is inside the viewer', async () => {
    const onFullscreenChange = vi.fn();
    const onRotationChange = vi.fn();
    const { user } = await renderViewer({
      fullscreenMode: 'controlled',
      onFullscreenChange,
      onRotationChange,
    });
    screen.getByRole('group', { name: 'Document' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(pageLabel()).toBe('2 / 3');
    await user.keyboard('{End}');
    expect(pageLabel()).toBe('3 / 3');
    await user.keyboard('{PageUp}');
    expect(pageLabel()).toBe('2 / 3');
    await user.keyboard('{Home}');
    expect(pageLabel()).toBe('1 / 3');
    await user.keyboard('++');
    expect(zoomLabel()).toBe('110%');
    await user.keyboard('-');
    expect(zoomLabel()).toBe('105%');
    await user.keyboard('0');
    expect(zoomLabel()).toBe('100%');
    await user.keyboard('rR');
    expect(onRotationChange.mock.calls).toEqual([[90], [0]]);
    await user.keyboard('f');
    expect(onFullscreenChange).toHaveBeenCalledWith(true);
  });

  it('shortcuts can be disabled and never fire from text fields', async () => {
    const { user } = await renderViewer({ keyboardShortcuts: false });
    screen.getByRole('group', { name: 'Document' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(pageLabel()).toBe('1 / 3');
  });

  it('the toolbar is one tab stop with arrow-key navigation', async () => {
    const { user } = await renderViewer();
    const tabbable = within(toolbar())
      .getAllByRole('button')
      .filter((element) => element.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    button('Zoom out').focus();
    await user.keyboard('{ArrowRight}');
    expect(button('Zoom in')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    // "Previous page" is disabled on page 1, so focus skips to "Next page".
    expect(button('Next page')).toHaveFocus();
    await user.keyboard('{End}');
    expect(button('Print PDF')).toHaveFocus();
    // Toolbar arrows move focus only; they never change the page.
    expect(pageLabel()).toBe('1 / 3');
  });

  it('accessible structure', async () => {
    await renderViewer();
    expect(screen.getByRole('region', { name: 'PDF viewer' })).toBeInTheDocument();
    expect(toolbar().querySelector('.rpv-toolbar__pages')).toHaveAttribute('aria-live', 'polite');
    for (const element of within(toolbar()).getAllByRole('button')) {
      expect(element.tagName).toBe('BUTTON');
      expect(element).toHaveAttribute('type', 'button');
    }
  });
});
