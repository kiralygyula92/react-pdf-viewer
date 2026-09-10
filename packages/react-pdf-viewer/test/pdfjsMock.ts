import type { getDocument, PageViewport, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { vi, type Mock } from 'vitest';
import { configurePdfJs, resetPdfJs, type PdfJsModule } from '../src/core/pdfjs';

// Parameter types come from the real, pinned pdfjs-dist; the mocks below are checked against them
// so a signature change in pdfjs-dist breaks the typecheck instead of silently passing tests.
type DocumentInitParameters = NonNullable<Parameters<typeof getDocument>[0]>;
type RenderParameters = Parameters<PDFPageProxy['render']>[0];
type GetViewportParameters = NonNullable<Parameters<PDFPageProxy['getViewport']>[0]>;

export class RenderingCancelledException extends Error {
  override name = 'RenderingCancelledException';
}

export class PasswordException extends Error {
  override name = 'PasswordException';
  constructor(
    message: string,
    readonly code: number,
  ) {
    super(message);
  }
}

export class InvalidPDFException extends Error {
  override name = 'InvalidPDFException';
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // Rejections are observed by the code under test; avoid unhandled-rejection noise otherwise.
  promise.catch(() => undefined);
  return { promise, resolve, reject };
}

export const LETTER = { width: 612, height: 792 } as const;

export interface MockPageSpec {
  width: number;
  height: number;
  /** Intrinsic `/Rotate`. */
  rotate?: number;
}

export interface MockRenderTask {
  params: RenderParameters;
  promise: Promise<void>;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  cancel: Mock<() => void>;
  resolve: () => void;
  reject: (error: unknown) => void;
}

export interface MockViewport {
  width: number;
  height: number;
  scale: number;
  rotation: number;
}

export interface MockPage {
  pageNumber: number;
  rotate: number;
  view: number[];
  getViewport: Mock<(params: GetViewportParameters) => PageViewport>;
  render: Mock<(params: RenderParameters) => MockRenderTask>;
  cleanup: Mock<() => boolean>;
}

export interface MockDocument {
  numPages: number;
  fingerprints: string[];
  pages: MockPage[];
  getPage: Mock<(pageNumber: number) => Promise<MockPage>>;
  getData: Mock<() => Promise<Uint8Array>>;
  destroy: Mock<() => Promise<void>>;
}

export interface MockDocumentOptions {
  pages?: MockPageSpec[] | undefined;
  numPages?: number | undefined;
  autoResolveRender?: boolean | undefined;
}

export interface MockDocumentHandle {
  document: MockDocument;
  renderTasks: MockRenderTask[];
  /** The mock typed as the real proxy, for passing to components under test. */
  proxy: PDFDocumentProxy;
}

function createRenderTask(params: RenderParameters, autoResolve: boolean): MockRenderTask {
  const { promise, resolve, reject } = deferred<undefined>();
  const task: MockRenderTask = {
    params,
    promise,
    status: 'pending',
    cancel: vi.fn(() => {
      if (task.status === 'pending') {
        task.status = 'cancelled';
        reject(new RenderingCancelledException('Rendering cancelled, page 1'));
      }
    }),
    resolve: () => {
      if (task.status === 'pending') {
        task.status = 'completed';
        resolve(undefined);
      }
    },
    reject: (error) => {
      if (task.status === 'pending') {
        task.status = 'failed';
        reject(error);
      }
    },
  };
  if (autoResolve) {
    queueMicrotask(task.resolve);
  }
  return task;
}

function createViewport(spec: MockPageSpec, { scale, rotation }: GetViewportParameters) {
  const angle = (((rotation ?? spec.rotate ?? 0) % 360) + 360) % 360;
  const swap = angle === 90 || angle === 270;
  const viewport: MockViewport = {
    width: (swap ? spec.height : spec.width) * scale,
    height: (swap ? spec.width : spec.height) * scale,
    scale,
    rotation: angle,
  };
  return viewport as unknown as PageViewport;
}

/** A mock `PDFDocumentProxy` whose render tasks resolve on demand (or automatically). */
export function createMockDocument(options: MockDocumentOptions = {}): MockDocumentHandle {
  const specs: MockPageSpec[] =
    options.pages ?? Array.from({ length: options.numPages ?? 3 }, () => ({ ...LETTER }));
  const renderTasks: MockRenderTask[] = [];
  const pages = specs.map((spec, index): MockPage => ({
    pageNumber: index + 1,
    rotate: spec.rotate ?? 0,
    view: [0, 0, spec.width, spec.height],
    getViewport: vi.fn((params: GetViewportParameters) => createViewport(spec, params)),
    render: vi.fn((params: RenderParameters) => {
      const task = createRenderTask(params, options.autoResolveRender ?? false);
      renderTasks.push(task);
      return task;
    }),
    cleanup: vi.fn(() => true),
  }));
  const document: MockDocument = {
    numPages: pages.length,
    fingerprints: ['mock-fingerprint'],
    pages,
    getPage: vi.fn((pageNumber: number) => {
      const page = pages[pageNumber - 1];
      return page ? Promise.resolve(page) : Promise.reject(new Error('Invalid page request.'));
    }),
    getData: vi.fn(() => Promise.resolve(new Uint8Array([0x25, 0x50, 0x44, 0x46]))),
    destroy: vi.fn(() => Promise.resolve()),
  };
  return {
    document,
    renderTasks,
    proxy: document as unknown as PDFDocumentProxy,
  };
}

export interface MockLoadingTask {
  params: DocumentInitParameters;
  promise: Promise<MockDocument>;
  handle: MockDocumentHandle;
  onPassword: ((update: (password: string) => void, reason: number) => void) | null;
  destroy: Mock<() => Promise<void>>;
  resolve: () => void;
  reject: (error: unknown) => void;
}

export interface MockPdfjsOptions extends MockDocumentOptions {
  autoResolveDocument?: boolean | undefined;
}

export interface MockPdfjs {
  module: PdfJsModule;
  getDocument: Mock<(params: DocumentInitParameters) => MockLoadingTask>;
  loadingTasks: MockLoadingTask[];
  GlobalWorkerOptions: { workerSrc: string; workerPort: Worker | null };
  /** The most recent loading task (throws when there is none). */
  lastTask: () => MockLoadingTask;
}

/** A mock `pdfjs-dist` module. Each `getDocument` call creates a fresh mock document. */
export function createMockPdfjs(options: MockPdfjsOptions = {}): MockPdfjs {
  const loadingTasks: MockLoadingTask[] = [];
  const getDocument = vi.fn((params: DocumentInitParameters) => {
    const handle = createMockDocument(options);
    const { promise, resolve, reject } = deferred<MockDocument>();
    const task: MockLoadingTask = {
      params,
      promise,
      handle,
      onPassword: null,
      destroy: vi.fn(async () => {
        await handle.document.destroy();
      }),
      resolve: () => resolve(handle.document),
      reject,
    };
    if (options.autoResolveDocument) {
      queueMicrotask(task.resolve);
    }
    loadingTasks.push(task);
    return task;
  });
  const GlobalWorkerOptions = { workerSrc: '', workerPort: null };
  const module = { getDocument, GlobalWorkerOptions, version: '6.3.289' };
  return {
    module: module as unknown as PdfJsModule,
    getDocument,
    loadingTasks,
    GlobalWorkerOptions,
    lastTask: () => {
      const task = loadingTasks.at(-1);
      if (!task) {
        throw new Error('getDocument was not called');
      }
      return task;
    },
  };
}

/** Resets the PDF.js loader and installs a fresh mock with self-hosted asset URLs. */
export function installMockPdfjs(options: MockPdfjsOptions = {}): MockPdfjs {
  const mock = createMockPdfjs(options);
  resetPdfJs();
  configurePdfJs({
    loader: () => Promise.resolve(mock.module),
    workerSrc: '/pdfjs/pdf.worker.min.mjs',
    cMapUrl: '/pdfjs/cmaps/',
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    wasmUrl: '/pdfjs/wasm/',
    iccUrl: '/pdfjs/iccs/',
  });
  return mock;
}
