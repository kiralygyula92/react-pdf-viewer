import { memo, useCallback } from 'react';
import { normalizeRotation } from '../core/geometry.js';
import { PdfViewer } from '../PdfViewer.js';
import type { PdfViewerError } from '../types.js';

/** The original component's props, unchanged. */
export interface CustomPdfViewerProps {
  /** Document URL. `''` shows the empty state. */
  pdfUrl: string;
  /** Download file name. */
  documentName?: string;
  /** Called with the error message. */
  onError?: (error: string) => void;
  /** Fullscreen layout (the parent presents fullscreen). */
  isFullscreen?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  /** 1-based page. */
  currentPage?: number;
  onPageChange?: (page: number) => void;
  /** 1 = 100%. */
  scale?: number;
  onScaleChange?: (scale: number) => void;
  /** Degrees clockwise. */
  rotation?: number;
  onRotationChange?: (rotation: number) => void;
}

/** {@link CustomPdfViewerProps} plus the replacement for the original's hard-coded 401 redirect. */
export interface CustomPdfViewerCompatProps extends CustomPdfViewerProps {
  /** Called on HTTP 401 instead of showing an error (the original purged auth and redirected). */
  onUnauthorized?: () => void;
}

function CustomPdfViewerImpl({
  pdfUrl,
  documentName,
  onError,
  isFullscreen,
  onFullscreenChange,
  currentPage,
  onPageChange,
  scale,
  onScaleChange,
  rotation,
  onRotationChange,
  onUnauthorized,
}: CustomPdfViewerCompatProps) {
  const handleError = useCallback((error: PdfViewerError) => onError?.(error.message), [onError]);
  const handleHttpError = useCallback(
    (response: Response) => {
      if (response.status === 401 && onUnauthorized) {
        onUnauthorized();
        return true;
      }
      return false;
    },
    [onUnauthorized],
  );

  return (
    <PdfViewer
      source={pdfUrl}
      fileName={documentName}
      fullscreenMode="controlled"
      fullscreen={isFullscreen}
      onFullscreenChange={onFullscreenChange}
      page={currentPage}
      onPageChange={onPageChange}
      scale={scale}
      onScaleChange={onScaleChange}
      rotation={rotation === undefined ? undefined : normalizeRotation(rotation)}
      onRotationChange={onRotationChange}
      onError={handleError}
      onHttpError={handleHttpError}
      printMode="render"
    />
  );
}

/**
 * Drop-in replacement for the original `CustomPdfViewer`: same props and semantics, backed by
 * `PdfViewer`. Values the parent does not control are kept internally.
 */
export const CustomPdfViewer = memo(CustomPdfViewerImpl);
