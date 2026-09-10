import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { configurePdfJs } from '../src/core/pdfjs';
import {
  usePdfDocument,
  type UsePdfDocumentOptions,
  type UsePdfDocumentResult,
} from '../src/hooks/usePdfDocument';
import type { PdfSource, PdfViewerError } from '../src/types';
import { installMockPdfjs, InvalidPDFException } from './pdfjsMock';

const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

const okFetcher = () =>
  vi.fn((_url: string, _init: RequestInit) => Promise.resolve(new Response(BYTES)));

interface Props {
  src: PdfSource | null | undefined;
  opts?: UsePdfDocumentOptions | undefined;
}

function renderDocument(src: Props['src'], opts?: UsePdfDocumentOptions) {
  return renderHook<UsePdfDocumentResult, Props>(
    ({ src: source, opts: options }) => usePdfDocument(source, options),
    { initialProps: { src, opts } },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePdfDocument', () => {
  it('E-01: fetches a URL source and passes the bytes to PDF.js', async () => {
    const mock = installMockPdfjs({ autoResolveDocument: true });
    const fetcher = okFetcher();
    const { result } = renderDocument('https://x.test/a.pdf', { fetcher });
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetcher).toHaveBeenCalledWith('https://x.test/a.pdf', expect.any(Object));
    expect(mock.lastTask().params.data).toEqual(BYTES);
    expect(result.current.numPages).toBe(3);
    expect(result.current.document).toBe(mock.lastTask().handle.document);
  });

  it('E-01: loads Blob and ArrayBuffer sources without fetching', async () => {
    installMockPdfjs({ autoResolveDocument: true });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderDocument(new Blob([BYTES]));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    rerender({ src: BYTES.slice().buffer });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('E-04: an empty source is idle from the first render (no loading flash)', () => {
    const mock = installMockPdfjs();
    for (const empty of ['', null, undefined]) {
      const { result } = renderDocument(empty);
      expect(result.current).toMatchObject({ status: 'idle', document: null, numPages: 0 });
    }
    expect(mock.getDocument).not.toHaveBeenCalled();
  });

  it('E-07: getDocument receives asset URLs, isEvalSupported: false and per-instance options', async () => {
    const mock = installMockPdfjs({ autoResolveDocument: true });
    const { result } = renderDocument(BYTES, { pdfjsOptions: { verbosity: 0 }, password: 'demo' });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mock.lastTask().params).toMatchObject({
      cMapUrl: '/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/pdfjs/standard_fonts/',
      isEvalSupported: false,
      verbosity: 0,
      password: 'demo',
    });
  });

  it('E-03: an HTTP error handled by onHttpError leaves the viewer idle without onError', async () => {
    const mock = installMockPdfjs();
    const onError = vi.fn();
    const onHttpError = vi.fn(() => true);
    const fetcher = () => Promise.resolve(new Response(null, { status: 401 }));
    const { result } = renderDocument('/secure.pdf', { fetcher, onHttpError, onError });
    await waitFor(() => expect(onHttpError).toHaveBeenCalled());
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(onError).not.toHaveBeenCalled();
    expect(mock.getDocument).not.toHaveBeenCalled();
  });

  it('KI-09: reports HTTP, parse and library failures through onError', async () => {
    const mock = installMockPdfjs();
    const onError = vi.fn<(error: PdfViewerError) => void>();
    const fetcher = () =>
      Promise.resolve(new Response(JSON.stringify({ title: 'Server exploded' }), { status: 500 }));
    const { result, rerender } = renderDocument('/a.pdf', { fetcher, onError });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toMatchObject({
      code: 'HTTP_ERROR',
      status: 500,
      message: 'Server exploded',
    });

    rerender({ src: BYTES, opts: { onError } });
    await waitFor(() => expect(mock.loadingTasks).toHaveLength(1));
    act(() => mock.lastTask().reject(new InvalidPDFException('Invalid PDF structure.')));
    await waitFor(() => expect(result.current.error?.code).toBe('INVALID_PDF'));

    configurePdfJs({ loader: () => Promise.reject(new Error('chunk load failed')) });
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.error?.code).toBe('PDFJS_LOAD_FAILED'));
    expect(onError.mock.calls.map(([error]) => error.code)).toEqual([
      'HTTP_ERROR',
      'INVALID_PDF',
      'PDFJS_LOAD_FAILED',
    ]);
  });

  it('KI-07: a stale load can never overwrite a newer one', async () => {
    const mock = installMockPdfjs();
    const { result, rerender } = renderDocument(new Uint8Array([1]));
    await waitFor(() => expect(mock.loadingTasks).toHaveLength(1));
    rerender({ src: new Uint8Array([2]) });
    await waitFor(() => expect(mock.loadingTasks).toHaveLength(2));
    const [stale, latest] = mock.loadingTasks;
    if (!stale || !latest) throw new Error('expected two loads');

    act(() => latest.resolve());
    await waitFor(() => expect(result.current.document).toBe(latest.handle.document));
    // The stale load resolves last, exactly the race the original lost.
    await act(async () => {
      stale.resolve();
      await stale.promise;
    });
    expect(result.current.document).toBe(latest.handle.document);
    expect(stale.destroy).toHaveBeenCalled();
    expect(stale.handle.document.destroy).toHaveBeenCalled();
    expect(latest.destroy).not.toHaveBeenCalled();
  });

  it('E-05 / KI-07: a source change aborts the in-flight fetch; unmount destroys the document', async () => {
    const mock = installMockPdfjs({ autoResolveDocument: true });
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn((url: string, init: RequestInit) => {
      if (init.signal) signals.push(init.signal);
      return url === '/slow.pdf'
        ? new Promise<Response>(() => undefined)
        : Promise.resolve(new Response(BYTES));
    });
    const { result, rerender, unmount } = renderDocument('/slow.pdf', { fetcher });
    await waitFor(() => expect(signals).toHaveLength(1));
    rerender({ src: '/fast.pdf', opts: { fetcher } });
    expect(signals[0]?.aborted).toBe(true);
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mock.loadingTasks).toHaveLength(1);

    unmount();
    expect(mock.lastTask().destroy).toHaveBeenCalled();
  });

  it('reload() loads again and destroys the previous document', async () => {
    const mock = installMockPdfjs({ autoResolveDocument: true });
    const { result } = renderDocument(BYTES);
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const first = mock.lastTask();
    act(() => result.current.reload());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mock.loadingTasks).toHaveLength(2);
    expect(first.destroy).toHaveBeenCalled();
    expect(result.current.document).toBe(mock.lastTask().handle.document);
  });

  it('works under StrictMode and never exposes a destroyed document', async () => {
    const mock = installMockPdfjs({ autoResolveDocument: true });
    const { result } = renderHook(() => usePdfDocument(BYTES), { wrapper: StrictMode });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const committed = mock.loadingTasks.find(
      (task) => task.handle.proxy === result.current.document,
    );
    expect(committed?.destroy).not.toHaveBeenCalled();
  });
});
