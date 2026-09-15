// @vitest-environment node
/**
 * Integration: the real pdfjs-dist in Node (no canvas) against the demo's generated samples.
 * Covers source loading, page counts, intrinsic rotation, links, encryption and error mapping.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type * as PdfJs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { beforeAll, describe, expect, it } from 'vitest';
import { toPdfViewerError } from '../src/core/errors';
import { effectiveRotation } from '../src/core/geometry';
import { loadSource } from '../src/core/loadSource';

const SAMPLES = new URL('../../../apps/demo/public/samples/', import.meta.url);
const require = createRequire(import.meta.url);
let pdfjs: typeof PdfJs;

beforeAll(async () => {
  // PDF.js's build for Node and older runtimes (the modern build needs e.g. Promise.try).
  pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as typeof PdfJs;
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ).href;
});

const read = (file: string) => new Uint8Array(readFileSync(new URL(file, SAMPLES)));

async function open(file: string, password?: string): Promise<PDFDocumentProxy> {
  const loaded = await loadSource(read(file), new AbortController().signal);
  if (loaded.kind !== 'bytes') throw new Error('unexpected');
  return pdfjs.getDocument({
    data: loaded.data,
    verbosity: 0,
    ...(password === undefined ? {} : { password }),
  }).promise;
}

async function text(doc: PDFDocumentProxy, pageNumber: number): Promise<string> {
  const content = await (await doc.getPage(pageNumber)).getTextContent();
  return content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
}

describe('real pdfjs-dist with the demo samples', () => {
  it('loads bytes and reports page counts and sizes', async () => {
    const letter = await open('letter-3pages.pdf');
    expect(letter.numPages).toBe(3);
    expect((await letter.getPage(1)).view).toEqual([0, 0, 612, 792]);
    expect(await text(letter, 2)).toContain('Page 2 of 3');
    expect((await open('multipage.pdf')).numPages).toBe(40);

    const mixed = await open('mixed-sizes.pdf');
    const widths = await Promise.all(
      [1, 2, 3, 4].map(async (n) => Math.round((await mixed.getPage(n)).view[2] ?? 0)),
    );
    expect(widths).toEqual([612, 595, 1191, 227]);
  });

  it('reads the intrinsic /Rotate that the viewer adds to', async () => {
    const doc = await open('intrinsic-rotation.pdf');
    const rotations = await Promise.all([1, 2, 3].map(async (n) => (await doc.getPage(n)).rotate));
    expect(rotations).toEqual([0, 90, 180]);
    const page = await doc.getPage(2);
    const viewport = page.getViewport({ scale: 1, rotation: effectiveRotation(page.rotate, 0) });
    expect([viewport.width, viewport.height]).toEqual([792, 612]);
  });

  it('links.pdf has internal and external link annotations', async () => {
    const doc = await open('links.pdf');
    const annotations = await (await doc.getPage(1)).getAnnotations();
    const links = annotations.filter((annotation) => annotation.subtype === 'Link');
    expect(links).toHaveLength(2);
    expect(links.some((link) => link.url === 'https://mozilla.github.io/pdf.js/')).toBe(true);
    expect(links.some((link) => Array.isArray(link.dest))).toBe(true);
  });

  it('non-embedded standard fonts extract as text', async () => {
    const doc = await open('non-embedded-fonts.pdf');
    const content = await text(doc, 1);
    expect(content).toContain('Helvetica');
    expect(content).toContain('Courier-BoldOblique');
  });

  it('password.pdf requires "demo" and maps PDF.js password errors', async () => {
    await expect(open('password.pdf')).rejects.toSatisfy(
      (error) => toPdfViewerError(error, 'UNKNOWN').code === 'PASSWORD_REQUIRED',
    );
    await expect(open('password.pdf', 'wrong')).rejects.toSatisfy(
      (error) => toPdfViewerError(error, 'UNKNOWN').code === 'INCORRECT_PASSWORD',
    );
    const doc = await open('password.pdf', 'demo');
    expect(await text(doc, 1)).toContain('Unlocked');
  });

  it('maps a non-PDF response to INVALID_PDF', async () => {
    await expect(open('not-a-pdf.pdf')).rejects.toSatisfy(
      (error) => toPdfViewerError(error, 'UNKNOWN').code === 'INVALID_PDF',
    );
  });
});
