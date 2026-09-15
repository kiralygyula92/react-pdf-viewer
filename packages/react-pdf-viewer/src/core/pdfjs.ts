import type * as PdfJsNamespace from 'pdfjs-dist';
import type { PdfJsDocumentOptions } from '../types.js';
import { isDevelopment } from './env.js';
import { createPdfViewerError } from './errors.js';

/** The `pdfjs-dist` module namespace. */
export type PdfJsModule = typeof PdfJsNamespace;

/**
 * Global PDF.js configuration. Every field is optional; unset asset URLs default to the jsDelivr
 * CDN copy of the **exact installed** `pdfjs-dist` version. Self-hosting is recommended for
 * production (see the README).
 */
export interface PdfJsConfig {
  /**
   * Returns the `pdfjs-dist` module. Use it to select the legacy build
   * (`() => import('pdfjs-dist/legacy/build/pdf.mjs')`) or a pre-loaded instance.
   *
   * @defaultValue `() => import('pdfjs-dist')`
   */
  loader?: () => Promise<PdfJsModule>;
  /**
   * Worker script URL (e.g. from `import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`).
   * A worker already set on `GlobalWorkerOptions` is respected.
   *
   * @defaultValue the jsDelivr worker for the installed version
   */
  workerSrc?: string;
  /** A ready `Worker` running the PDF.js worker script. Takes precedence over `workerSrc`. */
  workerPort?: Worker;
  /**
   * Base URL of the CMap files, with a trailing slash.
   *
   * @defaultValue jsDelivr `cmaps/` for the installed version
   */
  cMapUrl?: string;
  /** Whether the CMaps are binary-packed. Default `true`. */
  cMapPacked?: boolean;
  /**
   * Base URL of the standard font data, with a trailing slash.
   *
   * @defaultValue jsDelivr `standard_fonts/` for the installed version
   */
  standardFontDataUrl?: string;
  /**
   * Base URL of the WebAssembly decoders, with a trailing slash.
   *
   * @defaultValue jsDelivr `wasm/` for the installed version
   */
  wasmUrl?: string;
  /**
   * Base URL of the ICC color profiles, with a trailing slash.
   *
   * @defaultValue jsDelivr `iccs/` for the installed version
   */
  iccUrl?: string;
  /**
   * Forwarded to `getDocument` for builds that still support it. Default `false` (defense in depth
   * against CVE-2024-4367; `pdfjs-dist` 5+ removed eval-based font compilation entirely).
   */
  isEvalSupported?: boolean;
}

let config: PdfJsConfig = {};
let modulePromise: Promise<PdfJsModule> | null = null;
let cdnNoticeShown = false;

const defaultLoader = (): Promise<PdfJsModule> => import('pdfjs-dist');

const cdnBase = (version: string): string => `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/`;

function showCdnNotice(): void {
  if (cdnNoticeShown || !isDevelopment()) {
    return;
  }
  cdnNoticeShown = true;
  console.info(
    '[react-pdf-viewer] Loading PDF.js worker/assets from cdn.jsdelivr.net. ' +
      'Self-host them with configurePdfJs() for production (see the package README).',
  );
}

function applyWorkerOptions(lib: PdfJsModule): void {
  const options = lib.GlobalWorkerOptions;
  if (config.workerPort) {
    options.workerPort = config.workerPort;
  } else if (config.workerSrc) {
    options.workerSrc = config.workerSrc;
  } else if (!options.workerSrc && !options.workerPort) {
    // Respect a worker the application configured itself; otherwise match the installed version.
    options.workerSrc = `${cdnBase(lib.version)}build/pdf.worker.min.mjs`;
    showCdnNotice();
  }
}

/**
 * Configures PDF.js for every viewer instance. Call it once at startup, before the first viewer
 * mounts. Calls merge with previous configuration.
 *
 * @example
 * ```ts
 * import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
 * configurePdfJs({ workerSrc, cMapUrl: '/pdfjs/cmaps/', standardFontDataUrl: '/pdfjs/standard_fonts/' });
 * ```
 */
export function configurePdfJs(next: PdfJsConfig): void {
  const loaderChanged = next.loader !== undefined && next.loader !== config.loader;
  config = { ...config, ...next };
  if (loaderChanged) {
    modulePromise = null;
  } else if (modulePromise && (next.workerSrc !== undefined || next.workerPort !== undefined)) {
    modulePromise.then(applyWorkerOptions).catch(() => undefined);
  }
}

/** Resets configuration and the cached module. Test-only; not part of the public API. */
export function resetPdfJs(): void {
  config = {};
  modulePromise = null;
  cdnNoticeShown = false;
}

/**
 * Loads `pdfjs-dist` once and shares the result between all instances. A failed load is not
 * cached, so a later call (e.g. `reload()`) retries. Rejects with a `PDFJS_LOAD_FAILED` error.
 */
export function loadPdfJs(): Promise<PdfJsModule> {
  if (modulePromise) {
    return modulePromise;
  }
  const loader = config.loader ?? defaultLoader;
  const promise: Promise<PdfJsModule> = Promise.resolve()
    .then(loader)
    .then(
      (lib) => {
        applyWorkerOptions(lib);
        return lib;
      },
      (cause: unknown) => {
        if (modulePromise === promise) {
          modulePromise = null;
        }
        throw createPdfViewerError('PDFJS_LOAD_FAILED', undefined, { cause });
      },
    );
  modulePromise = promise;
  return promise;
}

/** `getDocument` options every load receives: asset URLs and security defaults. */
export function getDocumentDefaults(
  lib: PdfJsModule,
): PdfJsDocumentOptions & { isEvalSupported: boolean } {
  const base = cdnBase(lib.version);
  if (!config.cMapUrl || !config.standardFontDataUrl || !config.wasmUrl || !config.iccUrl) {
    showCdnNotice();
  }
  return {
    cMapUrl: config.cMapUrl ?? `${base}cmaps/`,
    cMapPacked: config.cMapPacked ?? true,
    standardFontDataUrl: config.standardFontDataUrl ?? `${base}standard_fonts/`,
    wasmUrl: config.wasmUrl ?? `${base}wasm/`,
    iccUrl: config.iccUrl ?? `${base}iccs/`,
    isEvalSupported: config.isEvalSupported ?? false,
  };
}
