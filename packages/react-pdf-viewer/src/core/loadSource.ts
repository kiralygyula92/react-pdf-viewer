import type { PdfRequestOptions, PdfSource } from '../types.js';
import { createPdfViewerError, isAbortError } from './errors.js';

/** Result of reading a source: PDF bytes, or an HTTP error the host handled itself. */
export type LoadedSource =
  { readonly kind: 'bytes'; readonly data: Uint8Array } | { readonly kind: 'handled' };

/** `null`, `undefined` and `''` mean "no document". */
export function isEmptySource(source: PdfSource | null | undefined): source is null | undefined {
  return source === null || source === undefined || source === '';
}

function isBlob(value: unknown): value is Blob {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === 'function' &&
    typeof (value as Blob).size === 'number'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * The default message logic: RFC 7807 `detail`, then `title`, then a JSON string body,
 * then `Failed to fetch PDF: {status} {statusText}`.
 */
export async function defaultHttpErrorMessage(response: Response): Promise<string> {
  let message = `Failed to fetch PDF: ${response.status} ${response.statusText}`;
  try {
    const body: unknown = await response.clone().json();
    if (isRecord(body) && body['detail']) {
      message = String(body['detail']);
    } else if (isRecord(body) && body['title']) {
      message = String(body['title']);
    } else if (typeof body === 'string') {
      message = body;
    }
  } catch {
    // Not JSON: keep the status message.
  }
  return message;
}

function combineSignals(own: AbortSignal, external: AbortSignal | null | undefined): AbortSignal {
  if (!external) {
    return own;
  }
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([own, external]);
  }
  // Older browsers (Safari before 17.4) have no AbortSignal.any: link the two by hand.
  const controller = new AbortController();
  const abort = (source: AbortSignal) => () => controller.abort(source.reason);
  for (const signal of [own, external]) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', abort(signal), { once: true });
  }
  return controller.signal;
}

async function fetchSource(
  url: string,
  signal: AbortSignal,
  options: PdfRequestOptions,
): Promise<LoadedSource> {
  const init: RequestInit = {
    ...options.requestInit,
    signal: combineSignals(signal, options.requestInit?.signal),
  };

  let response: Response;
  try {
    response = options.fetcher ? await options.fetcher(url, init) : await fetch(url, init);
  } catch (error) {
    if (signal.aborted || isAbortError(error)) {
      throw error;
    }
    const message = error instanceof Error && error.message ? error.message : undefined;
    throw createPdfViewerError('NETWORK_ERROR', message, { cause: error });
  }

  if (!response.ok) {
    const handled = options.onHttpError ? await options.onHttpError(response) : undefined;
    signal.throwIfAborted();
    if (handled === true) {
      return { kind: 'handled' };
    }
    const message =
      (await options.getHttpErrorMessage?.(response)) ?? (await defaultHttpErrorMessage(response));
    throw createPdfViewerError('HTTP_ERROR', message, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  signal.throwIfAborted();
  return { kind: 'bytes', data: new Uint8Array(buffer) };
}

/**
 * Turns any {@link PdfSource} into bytes for PDF.js.
 *
 * Binary sources are copied because PDF.js transfers (detaches) the buffer it receives; without
 * the copy a consumer's `ArrayBuffer` would become unusable after the first load.
 */
export async function loadSource(
  source: PdfSource,
  signal: AbortSignal,
  options: PdfRequestOptions = {},
): Promise<LoadedSource> {
  signal.throwIfAborted();
  if (typeof source === 'string' || source instanceof URL) {
    return fetchSource(source.toString(), signal, options);
  }
  if (isBlob(source)) {
    const buffer = await source.arrayBuffer();
    signal.throwIfAborted();
    return { kind: 'bytes', data: new Uint8Array(buffer) };
  }
  if (ArrayBuffer.isView(source)) {
    const { buffer, byteOffset, byteLength } = source;
    return {
      kind: 'bytes',
      data: new Uint8Array(buffer.slice(byteOffset, byteOffset + byteLength)),
    };
  }
  return { kind: 'bytes', data: new Uint8Array(source.slice(0)) };
}
