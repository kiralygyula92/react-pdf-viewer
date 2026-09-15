import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configurePdfJs, getDocumentDefaults, loadPdfJs, resetPdfJs } from '../src/core/pdfjs';
import { createMockPdfjs } from './pdfjsMock';

beforeEach(() => {
  resetPdfJs();
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PDF.js loader', () => {
  it('concurrent callers share a single module load', async () => {
    const mock = createMockPdfjs();
    const loader = vi.fn(() => Promise.resolve(mock.module));
    configurePdfJs({ loader });
    const [a, b] = await Promise.all([loadPdfJs(), loadPdfJs()]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    await loadPdfJs();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('a failed load reports PDFJS_LOAD_FAILED and is retried on the next call', async () => {
    const mock = createMockPdfjs();
    const loader = vi
      .fn<() => Promise<typeof mock.module>>()
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValueOnce(mock.module);
    configurePdfJs({ loader });
    await expect(loadPdfJs()).rejects.toMatchObject({ code: 'PDFJS_LOAD_FAILED' });
    await expect(loadPdfJs()).resolves.toBe(mock.module);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('defaults the worker to the CDN build matching the installed version', async () => {
    const mock = createMockPdfjs();
    configurePdfJs({ loader: () => Promise.resolve(mock.module) });
    await loadPdfJs();
    expect(mock.GlobalWorkerOptions.workerSrc).toBe(
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs',
    );
    expect(console.info).toHaveBeenCalledOnce();
  });

  it('respects a configured or pre-existing worker', async () => {
    const mock = createMockPdfjs();
    mock.GlobalWorkerOptions.workerSrc = '/host/worker.mjs';
    configurePdfJs({ loader: () => Promise.resolve(mock.module) });
    await loadPdfJs();
    expect(mock.GlobalWorkerOptions.workerSrc).toBe('/host/worker.mjs');

    configurePdfJs({ workerSrc: '/configured/worker.mjs' });
    await vi.waitFor(() =>
      expect(mock.GlobalWorkerOptions.workerSrc).toBe('/configured/worker.mjs'),
    );
  });

  it('getDocument defaults include cMaps, standard fonts and isEvalSupported: false', async () => {
    const mock = createMockPdfjs();
    configurePdfJs({ loader: () => Promise.resolve(mock.module) });
    const lib = await loadPdfJs();
    expect(getDocumentDefaults(lib)).toEqual({
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/standard_fonts/',
      wasmUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/wasm/',
      iccUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/iccs/',
      isEvalSupported: false,
    });
    configurePdfJs({ cMapUrl: '/cmaps/', standardFontDataUrl: '/fonts/' });
    expect(getDocumentDefaults(lib)).toMatchObject({
      cMapUrl: '/cmaps/',
      standardFontDataUrl: '/fonts/',
      isEvalSupported: false,
    });
  });
});
