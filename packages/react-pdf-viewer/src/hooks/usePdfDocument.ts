import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { isAbortError, toPdfViewerError } from '../core/errors.js';
import { isEmptySource, loadSource } from '../core/loadSource.js';
import { getDocumentDefaults, loadPdfJs } from '../core/pdfjs.js';
import type {
  PdfDocumentStatus,
  PdfJsDocumentOptions,
  PdfRequestOptions,
  PdfSource,
  PdfViewerError,
} from '../types.js';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect.js';

/** Options for {@link usePdfDocument}. Changes apply on the next load, except `password`. */
export interface UsePdfDocumentOptions extends PdfRequestOptions {
  /** Password for encrypted documents. Changing it reloads the document. */
  password?: string | undefined;
  /** Per-instance `getDocument` overrides. */
  pdfjsOptions?: PdfJsDocumentOptions | undefined;
  /** Called once the document is ready. */
  onLoad?: ((document: PDFDocumentProxy) => void) | undefined;
  /** Called for every load failure except aborts and handled HTTP errors. */
  onError?: ((error: PdfViewerError) => void) | undefined;
}

/** State returned by {@link usePdfDocument}. */
export interface UsePdfDocumentResult {
  /** `idle` (no source, or HTTP error handled by the host), `loading`, `ready` or `error`. */
  status: PdfDocumentStatus;
  /** The loaded document while `status === 'ready'`. Never a destroyed document. */
  document: PDFDocumentProxy | null;
  /** Page count, `0` without a document. */
  numPages: number;
  /** The failure while `status === 'error'`. */
  error: PdfViewerError | null;
  /** Loads the current source again (e.g. after an error). */
  reload: () => void;
}

interface LoadState {
  source: PdfSource | null | undefined;
  password: string | undefined;
  attempt: number;
  status: PdfDocumentStatus;
  document: PDFDocumentProxy | null;
  error: PdfViewerError | null;
}

/**
 * Loads a PDF document. Every source change aborts the previous fetch, discards its result and
 * destroys the previous document; unmounting does the same.
 */
export function usePdfDocument(
  source: PdfSource | null | undefined,
  options: UsePdfDocumentOptions = {},
): UsePdfDocumentResult {
  const { password } = options;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState | null>(null);

  const optionsRef = useRef(options);
  useIsomorphicLayoutEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (isEmptySource(source)) {
      return;
    }
    let disposed = false;
    let task: PDFDocumentLoadingTask | null = null;
    const controller = new AbortController();
    const commit = (next: Pick<LoadState, 'status' | 'document' | 'error'>) => {
      if (!disposed) {
        setState({ source, password, attempt, ...next });
      }
    };

    const load = async () => {
      const lib = await loadPdfJs();
      const loaded = await loadSource(source, controller.signal, optionsRef.current);
      if (disposed) {
        return;
      }
      if (loaded.kind === 'handled') {
        commit({ status: 'idle', document: null, error: null });
        return;
      }
      task = lib.getDocument({
        ...getDocumentDefaults(lib),
        ...optionsRef.current.pdfjsOptions,
        data: loaded.data,
        ...(password === undefined ? {} : { password }),
      });
      const document = await task.promise;
      if (disposed) {
        return;
      }
      commit({ status: 'ready', document, error: null });
      optionsRef.current.onLoad?.(document);
    };

    load().catch((cause: unknown) => {
      if (disposed || isAbortError(cause)) {
        return;
      }
      const error = toPdfViewerError(cause, 'UNKNOWN');
      commit({ status: 'error', document: null, error });
      optionsRef.current.onError?.(error);
    });

    return () => {
      disposed = true;
      controller.abort();
      // Destroying the loading task also destroys its document.
      void task?.destroy();
    };
  }, [source, password, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  // State belongs to the current request only; anything else is a request still in flight.
  const current =
    state !== null &&
    Object.is(state.source, source) &&
    state.password === password &&
    state.attempt === attempt
      ? state
      : null;
  const status: PdfDocumentStatus = current
    ? current.status
    : isEmptySource(source)
      ? 'idle'
      : 'loading';
  const document = current?.document ?? null;

  return {
    status,
    document,
    numPages: document?.numPages ?? 0,
    error: current?.error ?? null,
    reload,
  };
}
