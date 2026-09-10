import { vi } from 'vitest';

/** Stubs `matchMedia`; `matches` decides every query (e.g. the compact breakpoint). */
export function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Stubs `ResizeObserver` so every observed element reports the given content-box size. */
export function stubResizeObserver(width: number, height: number) {
  class FakeResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      const entry = {
        target,
        contentRect: { width, height },
        contentBoxSize: [{ inlineSize: width, blockSize: height }],
      } as unknown as ResizeObserverEntry;
      this.callback([entry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
}

/** Stubs object URLs and anchor clicks; returns the clicked anchors. */
export function stubDownloads() {
  const clicked: HTMLAnchorElement[] = [];
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this);
  });
  return clicked;
}

/** Replaces the print iframe's window/document so print() can be observed in jsdom. */
export function stubPrintFrame() {
  const frameDocument = document.implementation.createHTMLDocument('print');
  const listeners = new Map<string, () => void>();
  const frameWindow = {
    focus: vi.fn(),
    print: vi.fn(() => listeners.get('afterprint')?.()),
    addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
  };
  vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(
    frameWindow as unknown as Window,
  );
  vi.spyOn(HTMLIFrameElement.prototype, 'contentDocument', 'get').mockReturnValue(frameDocument);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
    callback(new Blob(['png'], { type: 'image/png' })),
  );
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:page');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  return { frameWindow, frameDocument };
}
