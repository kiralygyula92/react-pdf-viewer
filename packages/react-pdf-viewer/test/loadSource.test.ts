import { describe, expect, it, vi } from 'vitest';
import { defaultHttpErrorMessage, isEmptySource, loadSource } from '../src/core/loadSource';

const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const signal = () => new AbortController().signal;

const json = (body: unknown, status: number, statusText = 'Error') =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  });

describe('loadSource', () => {
  it('E-01 / KI-10: fetches URL sources with requestInit and returns the bytes', async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(BYTES)));
    const result = await loadSource('https://x.test/a.pdf', signal(), {
      fetcher,
      requestInit: { credentials: 'include', headers: { Authorization: 'Bearer t' } },
    });
    expect(result).toEqual({ kind: 'bytes', data: BYTES });
    expect(fetcher).toHaveBeenCalledWith(
      'https://x.test/a.pdf',
      expect.objectContaining({ credentials: 'include', signal: expect.any(AbortSignal) }),
    );
  });

  it('E-01: uses the global fetch by default and accepts URL objects', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(BYTES)));
    vi.stubGlobal('fetch', fetchMock);
    await loadSource(new URL('https://x.test/b.pdf'), signal());
    expect(fetchMock).toHaveBeenCalledWith('https://x.test/b.pdf', expect.anything());
    vi.unstubAllGlobals();
  });

  it('E-01: reads Blob, ArrayBuffer and Uint8Array sources without detaching the original', async () => {
    const buffer = BYTES.slice().buffer;
    const fromBuffer = await loadSource(buffer, signal());
    const fromView = await loadSource(BYTES, signal());
    const fromBlob = await loadSource(new Blob([BYTES]), signal());
    for (const result of [fromBuffer, fromView, fromBlob]) {
      expect(result).toEqual({ kind: 'bytes', data: BYTES });
    }
    // Copies, so PDF.js may transfer them without breaking the caller's data.
    expect(fromBuffer.kind === 'bytes' && fromBuffer.data.buffer).not.toBe(buffer);
    expect(fromView.kind === 'bytes' && fromView.data).not.toBe(BYTES);
  });

  it('E-02: builds the HTTP error message detail → title → string → status', async () => {
    await expect(
      defaultHttpErrorMessage(json({ detail: 'Report expired', title: 'Gone' }, 410)),
    ).resolves.toBe('Report expired');
    await expect(defaultHttpErrorMessage(json({ title: 'Forbidden' }, 403))).resolves.toBe(
      'Forbidden',
    );
    await expect(defaultHttpErrorMessage(json('Plain message', 400))).resolves.toBe(
      'Plain message',
    );
    await expect(
      defaultHttpErrorMessage(new Response('<html>', { status: 500, statusText: 'Server Error' })),
    ).resolves.toBe('Failed to fetch PDF: 500 Server Error');
  });

  it('E-02: throws HTTP_ERROR with status, and the message is overridable', async () => {
    const fetcher = () => Promise.resolve(json({ detail: 'Nope' }, 404));
    await expect(loadSource('/a.pdf', signal(), { fetcher })).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      status: 404,
      message: 'Nope',
    });
    await expect(
      loadSource('/a.pdf', signal(), {
        fetcher,
        getHttpErrorMessage: (response) => Promise.resolve(`Custom ${response.status}`),
      }),
    ).rejects.toMatchObject({ message: 'Custom 404' });
  });

  it('E-03: onHttpError returning true marks the response as handled', async () => {
    const onHttpError = vi.fn((response: Response) => response.status === 401);
    const fetcher = () => Promise.resolve(new Response(null, { status: 401 }));
    await expect(loadSource('/a.pdf', signal(), { fetcher, onHttpError })).resolves.toEqual({
      kind: 'handled',
    });
    expect(onHttpError).toHaveBeenCalledOnce();
  });

  it('maps fetch rejections to NETWORK_ERROR but rethrows aborts', async () => {
    const failing = () => Promise.reject(new TypeError('Failed to fetch'));
    await expect(loadSource('/a.pdf', signal(), { fetcher: failing })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Failed to fetch',
    });

    const controller = new AbortController();
    const aborting = vi.fn((_url: string, init: RequestInit) => {
      controller.abort();
      return Promise.reject(init.signal?.reason);
    });
    await expect(
      loadSource('/a.pdf', controller.signal, { fetcher: aborting }),
    ).rejects.toHaveProperty('name', 'AbortError');
  });

  it('treats null, undefined and empty strings as empty', () => {
    expect(isEmptySource('')).toBe(true);
    expect(isEmptySource(null)).toBe(true);
    expect(isEmptySource(undefined)).toBe(true);
    expect(isEmptySource('a.pdf')).toBe(false);
  });
});
