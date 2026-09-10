import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PdfPageCanvas } from '../src/components/PdfPageCanvas';
import { createMockDocument, LETTER, type MockRenderTask, type MockViewport } from './pdfjsMock';

function setDevicePixelRatio(value: number) {
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value });
}

async function resolveTask(task: MockRenderTask | undefined) {
  if (!task) throw new Error('expected a render task');
  await act(async () => {
    task.resolve();
    await task.promise;
  });
}

const viewportOf = (task: MockRenderTask | undefined) =>
  task?.params.viewport as unknown as MockViewport;

afterEach(() => {
  setDevicePixelRatio(1);
  vi.unstubAllGlobals();
});

describe('PdfPageCanvas', () => {
  it('renders at the requested scale and owns the page size', async () => {
    const { proxy, renderTasks } = createMockDocument();
    const onRender = vi.fn();
    const { container } = render(
      <PdfPageCanvas
        document={proxy}
        page={1}
        scale={1.5}
        aria-label="Page 1 of 3"
        onRender={onRender}
      />,
    );
    await waitFor(() => expect(renderTasks).toHaveLength(1));
    await resolveTask(renderTasks[0]);
    expect(onRender).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, scale: 1.5, width: 918, height: 1188 }),
    );
    const pageBox = screen.getByRole('img', { name: 'Page 1 of 3' });
    expect(pageBox.style.width).toBe('918px');
    expect(pageBox.style.height).toBe('1188px');
    expect(container.querySelector('canvas')?.width).toBe(918);
  });

  it('E-06: clamps the rendered page to the document', async () => {
    const { proxy, document } = createMockDocument();
    render(<PdfPageCanvas document={proxy} page={99} />);
    await waitFor(() => expect(document.getPage).toHaveBeenCalledWith(3));
  });

  it('E-08 / KI-03: adds the user rotation to the page’s intrinsic rotation', async () => {
    const { proxy, renderTasks } = createMockDocument({ pages: [{ ...LETTER, rotate: 90 }] });
    render(<PdfPageCanvas document={proxy} page={1} rotation={90} />);
    await waitFor(() => expect(renderTasks).toHaveLength(1));
    expect(viewportOf(renderTasks[0])).toMatchObject({ rotation: 180, width: 612, height: 792 });
  });

  it('E-09 / KI-04: renders a HiDPI backing store with a matching transform', async () => {
    setDevicePixelRatio(2);
    const { proxy, renderTasks } = createMockDocument();
    const { container } = render(<PdfPageCanvas document={proxy} page={1} />);
    await waitFor(() => expect(renderTasks).toHaveLength(1));
    await resolveTask(renderTasks[0]);
    expect(renderTasks[0]?.params.transform).toEqual([2, 0, 0, 2, 0, 0]);
    const canvas = container.querySelector('canvas');
    expect([canvas?.width, canvas?.height]).toEqual([1224, 1584]);
    expect(container.querySelector<HTMLElement>('.rpv-page')?.style.width).toBe('612px');
  });

  it('KI-04: re-renders when the device pixel ratio changes', async () => {
    const listeners = new Set<() => void>();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
      })),
    );
    const { proxy, renderTasks } = createMockDocument({ autoResolveRender: true });
    const { container } = render(<PdfPageCanvas document={proxy} page={1} />);
    await waitFor(() => expect(container.querySelector('canvas')?.width).toBe(612));
    setDevicePixelRatio(2);
    // Snapshot: handlers re-subscribe while running, which would make Set iteration endless.
    act(() => [...listeners].forEach((listener) => listener()));
    await waitFor(() => expect(container.querySelector('canvas')?.width).toBe(1224));
    expect(renderTasks).toHaveLength(2);
  });

  it('KI-26: caps the canvas at maxCanvasPixels while keeping the CSS size', async () => {
    setDevicePixelRatio(2);
    const { proxy, renderTasks } = createMockDocument();
    const { container } = render(
      <PdfPageCanvas document={proxy} page={1} maxCanvasPixels={612 * 792} />,
    );
    await waitFor(() => expect(renderTasks).toHaveLength(1));
    await resolveTask(renderTasks[0]);
    expect(container.querySelector('canvas')?.width).toBe(612);
    expect(renderTasks[0]?.params.transform).toBeUndefined();
    expect(container.querySelector<HTMLElement>('.rpv-page')?.style.width).toBe('612px');
  });

  it('KI-02: ten rapid zoom changes produce exactly one completed render and no errors', async () => {
    const { proxy, renderTasks } = createMockDocument();
    const onRender = vi.fn();
    const onError = vi.fn();
    const element = (scale: number) => (
      <PdfPageCanvas
        document={proxy}
        page={1}
        scale={scale}
        onRender={onRender}
        onError={onError}
      />
    );
    const { rerender } = render(element(1));
    await waitFor(() => expect(renderTasks).toHaveLength(1));
    for (let step = 1; step <= 10; step++) {
      rerender(element(1 + step * 0.05));
      await waitFor(() => expect(renderTasks).toHaveLength(step + 1));
    }
    // Every superseded render was cancelled before it could finish.
    await act(async () => {
      renderTasks.forEach((task) => task.resolve());
      await Promise.allSettled(renderTasks.map((task) => task.promise));
    });
    expect(renderTasks.filter((task) => task.status === 'completed')).toHaveLength(1);
    expect(renderTasks.filter((task) => task.status === 'cancelled')).toHaveLength(10);
    expect(onRender).toHaveBeenCalledTimes(1);
    expect(onRender.mock.calls[0]?.[0]).toMatchObject({ scale: 1.5 });
    expect(onError).not.toHaveBeenCalled();
  });

  it('double-buffers: the visible canvas is replaced only when the next render completes', async () => {
    const { proxy, renderTasks } = createMockDocument();
    const { container, rerender } = render(<PdfPageCanvas document={proxy} page={1} scale={1} />);
    await waitFor(() => expect(renderTasks).toHaveLength(1));
    await resolveTask(renderTasks[0]);
    const first = container.querySelector('canvas');

    rerender(<PdfPageCanvas document={proxy} page={1} scale={2} />);
    await waitFor(() => expect(renderTasks).toHaveLength(2));
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    expect(container.querySelector('canvas')).toBe(first);

    await resolveTask(renderTasks[1]);
    const second = container.querySelector('canvas');
    expect(second).not.toBe(first);
    expect(second?.width).toBe(1224);
    expect(first?.width).toBe(0); // backing store released
  });

  it('KI-07: cleans up the previously displayed page after navigating', async () => {
    const { proxy, document } = createMockDocument({ autoResolveRender: true });
    const { rerender } = render(<PdfPageCanvas document={proxy} page={1} />);
    await waitFor(() => expect(document.pages[0]?.render).toHaveBeenCalled());
    rerender(<PdfPageCanvas document={proxy} page={2} />);
    await waitFor(() => expect(document.pages[0]?.cleanup).toHaveBeenCalled());
    expect(document.pages[1]?.cleanup).not.toHaveBeenCalled();
  });

  it('KI-15: fits the page into the available width without enlarging it', async () => {
    const { proxy, renderTasks } = createMockDocument({ autoResolveRender: true });
    const onRender = vi.fn();
    const { rerender } = render(
      <PdfPageCanvas document={proxy} page={1} fit={{ width: 306 }} onRender={onRender} />,
    );
    await waitFor(() =>
      expect(onRender).toHaveBeenLastCalledWith(expect.objectContaining({ scale: 0.5 })),
    );
    rerender(<PdfPageCanvas document={proxy} page={1} fit={{ width: 5000 }} onRender={onRender} />);
    await waitFor(() =>
      expect(onRender).toHaveBeenLastCalledWith(expect.objectContaining({ scale: 1 })),
    );
    expect(viewportOf(renderTasks[0]).width).toBe(306);
  });

  it('KI-09: shows a render failure in place of the page and can retry', async () => {
    const { proxy, renderTasks } = createMockDocument();
    const onError = vi.fn();
    render(
      <PdfPageCanvas
        document={proxy}
        page={1}
        aria-label="Page 1 of 3"
        onError={onError}
        renderError={(error, { retry }) => (
          <button type="button" onClick={retry}>
            Retry: {error.message}
          </button>
        )}
      />,
    );
    await waitFor(() => expect(renderTasks).toHaveLength(1));
    await act(async () => {
      renderTasks[0]?.reject(new Error('boom'));
      await renderTasks[0]?.promise.catch(() => undefined);
    });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'RENDER_FAILED', message: 'boom' }),
    );
    expect(screen.queryByRole('img')).toBeNull();

    act(() => screen.getByRole('button', { name: 'Retry: boom' }).click());
    await waitFor(() => expect(renderTasks).toHaveLength(2));
    await resolveTask(renderTasks[1]);
    expect(screen.getByRole('img', { name: 'Page 1 of 3' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
