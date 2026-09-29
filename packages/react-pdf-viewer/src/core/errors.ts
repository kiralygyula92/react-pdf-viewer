import type { PdfViewerError, PdfViewerErrorCode } from '../types.js';

const DEFAULT_MESSAGES: Record<PdfViewerErrorCode, string> = {
  PDFJS_LOAD_FAILED: 'Failed to load the PDF.js library',
  NETWORK_ERROR: 'Could not load the PDF. Check your connection and try again.',
  HTTP_ERROR: 'Failed to fetch PDF document',
  INVALID_PDF: 'Invalid or corrupted PDF file',
  PASSWORD_REQUIRED: 'This document is password protected',
  INCORRECT_PASSWORD: 'Incorrect password',
  RENDER_FAILED: 'Failed to render PDF page',
  DOWNLOAD_FAILED: 'Failed to download PDF',
  PRINT_FAILED: 'Failed to print PDF',
  UNKNOWN: 'Failed to load PDF document',
};

// pdfjs-dist `PasswordResponses.INCORRECT_PASSWORD`.
const PDFJS_INCORRECT_PASSWORD = 2;

interface ErrorDetails {
  status?: number | undefined;
  cause?: unknown;
}

class ViewerError extends Error implements PdfViewerError {
  declare readonly code: PdfViewerErrorCode;
  declare readonly status?: number;

  constructor(code: PdfViewerErrorCode, message: string, details: ErrorDetails) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = 'PdfViewerError';
    this.code = code;
    if (details.status !== undefined) {
      this.status = details.status;
    }
  }
}

/** Creates a {@link PdfViewerError}. `message` defaults to a generic text for the code. */
export function createPdfViewerError(
  code: PdfViewerErrorCode,
  message?: string,
  details: ErrorDetails = {},
): PdfViewerError {
  return new ViewerError(code, message || DEFAULT_MESSAGES[code], details);
}

/** Type guard for errors created by the viewer. */
export function isPdfViewerError(value: unknown): value is PdfViewerError {
  return value instanceof ViewerError;
}

function readProperty(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/** True for fetch aborts and PDF.js loading-task aborts. */
export function isAbortError(error: unknown): boolean {
  const name = readProperty(error, 'name');
  return name === 'AbortError' || name === 'AbortException';
}

/** True for PDF.js render cancellations, which are a normal outcome. */
export function isRenderCancelled(error: unknown): boolean {
  return readProperty(error, 'name') === 'RenderingCancelledException';
}

/**
 * Maps anything thrown by the loading or rendering pipeline to a {@link PdfViewerError}.
 * PDF.js exceptions are recognized by `name`, so this works with any `pdfjs-dist` build.
 */
export function toPdfViewerError(error: unknown, fallback: PdfViewerErrorCode): PdfViewerError {
  if (isPdfViewerError(error)) {
    return error;
  }

  let code = fallback;
  let status: number | undefined;
  switch (readProperty(error, 'name')) {
    case 'PasswordException':
      code =
        readProperty(error, 'code') === PDFJS_INCORRECT_PASSWORD
          ? 'INCORRECT_PASSWORD'
          : 'PASSWORD_REQUIRED';
      break;
    case 'InvalidPDFException':
      code = 'INVALID_PDF';
      break;
    case 'ResponseException': {
      code = 'HTTP_ERROR';
      const rawStatus = readProperty(error, 'status');
      status = typeof rawStatus === 'number' ? rawStatus : undefined;
      break;
    }
  }

  const rawMessage = readProperty(error, 'message');
  const message =
    typeof rawMessage === 'string' && rawMessage
      ? rawMessage
      : typeof error === 'string'
        ? error
        : undefined;

  return createPdfViewerError(code, message, { status, cause: error });
}
