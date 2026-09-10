import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ErrorView } from './components/ErrorView.js';
import { LoadingView, Spinner } from './components/LoadingView.js';
import { PdfPageCanvas } from './components/PdfPageCanvas.js';
import { PdfToolbar } from './components/Toolbar.js';
import { saveBytes, toPdfBlob } from './core/download.js';
import { isAbortError, toPdfViewerError } from './core/errors.js';
import { resolveFileName } from './core/fileName.js';
import { clampPage, normalizeRotation, type FitOptions } from './core/geometry.js';
import { printDocument } from './core/print.js';
import {
  DEFAULT_MAX_SCALE,
  DEFAULT_MIN_SCALE,
  DEFAULT_SCALE,
  DEFAULT_SCALE_STEP,
  nextScale,
  normalizeScale,
  scalesEqual,
  type ZoomOptions,
} from './core/scale.js';
import { useControllableState } from './hooks/useControllableState.js';
import { useElementSize } from './hooks/useElementSize.js';
import { useFullscreen } from './hooks/useFullscreen.js';
import { useIsomorphicLayoutEffect } from './hooks/useIsomorphicLayoutEffect.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { usePdfDocument } from './hooks/usePdfDocument.js';
import { useLabelContext, useLabels } from './labels.js';
import type { PdfSource, PdfViewerApi, PdfViewerError, PdfViewerProps, Rotation } from './types.js';

const subscribeNever = () => () => undefined;

async function openInNewTab(pdf: PDFDocumentProxy, source: PdfSource | null | undefined) {
  if (typeof source === 'string' || source instanceof URL) {
    window.open(source.toString(), '_blank', 'noopener,noreferrer');
    return;
  }
  const url = URL.createObjectURL(toPdfBlob(await pdf.getData()));
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * A PDF viewer: one page at a time with a toolbar for zoom, navigation, fullscreen, rotation,
 * download and print. With default props it reproduces the original `CustomPdfViewer`.
 *
 * @example
 * ```tsx
 * import { PdfViewer } from '@your-scope/react-pdf-viewer';
 * import '@your-scope/react-pdf-viewer/styles.css';
 *
 * <PdfViewer source="/report.pdf" fileName="report.pdf" />
 * ```
 */
export const PdfViewer = forwardRef<PdfViewerApi, PdfViewerProps>(function PdfViewer(props, ref) {
  const {
    source,
    fileName,
    page: pageProp,
    defaultPage = 1,
    onPageChange,
    scale: scaleProp,
    defaultScale = DEFAULT_SCALE,
    onScaleChange,
    rotation: rotationProp,
    defaultRotation = 0,
    onRotationChange,
    fullscreen: fullscreenProp,
    defaultFullscreen = false,
    onFullscreenChange,
    fullscreenMode: fullscreenModeProp,
    minScale = DEFAULT_MIN_SCALE,
    maxScale = DEFAULT_MAX_SCALE,
    scaleStep = DEFAULT_SCALE_STEP,
    zoomLevels,
    fitWidthAtDefaultScale = true,
    fitMode = 'none',
    requestInit,
    fetcher,
    onHttpError,
    getHttpErrorMessage,
    password,
    pdfjsOptions,
    toolbar = true,
    compactBreakpoint = 960,
    keyboardShortcuts = true,
    printMode = 'render',
    maxCanvasPixels,
    labels: labelOverrides,
    locale,
    renderLoading,
    renderError,
    renderToolbar,
    renderEmpty,
    onDocumentLoad,
    onPageRender,
    onError,
    onDownload,
    onPrint,
    className,
    style,
    id,
    'aria-label': ariaLabel,
  } = props;

  const labels = useLabels(labelOverrides);
  const labelContext = useLabelContext(locale);
  const zoom = useMemo<ZoomOptions>(
    () => ({ minScale, maxScale, scaleStep, zoomLevels }),
    [minScale, maxScale, scaleStep, zoomLevels],
  );

  // ── State ────────────────────────────────────────────────────────────────
  const [page, setPage] = useControllableState({
    value: pageProp,
    defaultValue: defaultPage,
    onChange: onPageChange,
    name: 'page',
  });
  const [scale, setScaleState] = useControllableState({
    value: scaleProp,
    defaultValue: defaultScale,
    onChange: onScaleChange,
    name: 'scale',
  });
  const [rotation, setRotation] = useControllableState<Rotation>({
    value: rotationProp,
    defaultValue: defaultRotation,
    onChange: onRotationChange,
    name: 'rotation',
  });
  const [fullscreen, setFullscreen] = useControllableState({
    value: fullscreenProp,
    defaultValue: defaultFullscreen,
    onChange: onFullscreenChange,
    name: 'fullscreen',
  });
  const fullscreenMode =
    fullscreenModeProp ?? (fullscreenProp === undefined ? 'native' : 'controlled');

  const callbacks = useRef({ onDownload, onPrint, onError, onDocumentLoad });
  useIsomorphicLayoutEffect(() => {
    callbacks.current = { onDownload, onPrint, onError, onDocumentLoad };
  });

  // ── Document ─────────────────────────────────────────────────────────────
  const handleLoad = useCallback((pdf: PDFDocumentProxy) => {
    callbacks.current.onDocumentLoad?.({
      numPages: pdf.numPages,
      fingerprint: pdf.fingerprints[0] ?? '',
    });
  }, []);
  const handleError = useCallback((error: PdfViewerError) => {
    callbacks.current.onError?.(error);
  }, []);
  const {
    status,
    document: pdfDocument,
    numPages,
    error,
    reload,
  } = usePdfDocument(source, {
    requestInit,
    fetcher,
    onHttpError,
    getHttpErrorMessage,
    password,
    pdfjsOptions,
    onLoad: handleLoad,
    onError: handleError,
  });

  // A new source opens on `defaultPage`; an out-of-range page is clamped and reported (KI-08).
  const isPageControlled = pageProp !== undefined;
  const handledDocument = useRef<{
    document: PDFDocumentProxy;
    source: PdfSource | null | undefined;
  } | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (!pdfDocument) {
      return;
    }
    const previous = handledDocument.current;
    if (previous?.document !== pdfDocument) {
      handledDocument.current = { document: pdfDocument, source };
      if (previous && !Object.is(previous.source, source) && !isPageControlled) {
        setPage(clampPage(defaultPage, pdfDocument.numPages));
        return;
      }
    }
    const clamped = clampPage(page, pdfDocument.numPages);
    if (clamped !== page) {
      setPage(clamped);
    }
  }, [pdfDocument, source, page, defaultPage, isPageControlled, setPage]);

  const displayPage = pdfDocument ? clampPage(page, numPages) : page;
  const canZoomIn = nextScale(scale, 1, zoom) !== null;
  const canZoomOut = nextScale(scale, -1, zoom) !== null;

  // ── Layout ───────────────────────────────────────────────────────────────
  const compact = useMediaQuery(`(max-width: ${compactBreakpoint - 0.05}px)`);
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);
  const [measureViewport, viewportSize] = useElementSize<HTMLDivElement>();
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(null);
  const viewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      measureViewport(node);
      setViewportElement(node);
    },
    [measureViewport],
  );
  const presentation = useFullscreen({
    mode: fullscreenMode,
    active: fullscreen,
    setActive: setFullscreen,
    element: rootElement,
  });
  const isClient = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  let fit: FitOptions | undefined;
  if (viewportSize && scalesEqual(scale, defaultScale)) {
    if (fitMode === 'width') {
      fit = { width: viewportSize.width, upscale: true };
    } else if (fitMode === 'page') {
      fit = { width: viewportSize.width, height: viewportSize.height, upscale: true };
    } else if (fitWidthAtDefaultScale) {
      fit = { width: viewportSize.width };
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  const goToPage = useCallback(
    (target: number) => {
      if (numPages > 0) {
        setPage(clampPage(target, numPages));
      }
    },
    [numPages, setPage],
  );
  const nextPage = useCallback(
    () => setPage((current) => (numPages > 0 ? clampPage(current + 1, numPages) : current)),
    [numPages, setPage],
  );
  const previousPage = useCallback(
    () => setPage((current) => (numPages > 0 ? clampPage(current - 1, numPages) : current)),
    [numPages, setPage],
  );
  const zoomIn = useCallback(
    () => setScaleState((current) => nextScale(current, 1, zoom) ?? current),
    [zoom, setScaleState],
  );
  const zoomOut = useCallback(
    () => setScaleState((current) => nextScale(current, -1, zoom) ?? current),
    [zoom, setScaleState],
  );
  const setScale = useCallback(
    (value: number) => setScaleState(normalizeScale(value, zoom)),
    [zoom, setScaleState],
  );
  const resetZoom = useCallback(() => setScaleState(defaultScale), [defaultScale, setScaleState]);
  const rotate = useCallback(
    (direction: 'cw' | 'ccw' = 'cw') =>
      setRotation((current) => normalizeRotation(current + (direction === 'ccw' ? -90 : 90))),
    [setRotation],
  );
  const toggleFullscreen = useCallback(() => setFullscreen((current) => !current), [setFullscreen]);

  const download = useCallback(async () => {
    if (!pdfDocument) {
      return;
    }
    try {
      const data = await pdfDocument.getData();
      const name = resolveFileName(fileName, source);
      if (callbacks.current.onDownload?.({ fileName: name, data }) === false) {
        return;
      }
      saveBytes(data, name);
    } catch (cause) {
      callbacks.current.onError?.(toPdfViewerError(cause, 'DOWNLOAD_FAILED'));
    }
  }, [pdfDocument, fileName, source]);

  const [printProgress, setPrintProgress] = useState<{ done: number; total: number } | null>(null);
  const printController = useRef<AbortController | null>(null);
  const print = useCallback(async () => {
    if (!pdfDocument || printController.current) {
      return;
    }
    if (callbacks.current.onPrint?.() === false) {
      return;
    }
    try {
      if (printMode === 'open-url') {
        await openInNewTab(pdfDocument, source);
        return;
      }
      const controller = new AbortController();
      printController.current = controller;
      setPrintProgress({ done: 0, total: pdfDocument.numPages });
      await printDocument(pdfDocument, {
        signal: controller.signal,
        onProgress: (done, total) => setPrintProgress({ done, total }),
      });
    } catch (cause) {
      if (!isAbortError(cause)) {
        callbacks.current.onError?.(toPdfViewerError(cause, 'PRINT_FAILED'));
      }
    } finally {
      printController.current = null;
      setPrintProgress(null);
    }
  }, [pdfDocument, printMode, source]);
  const cancelPrint = useCallback(() => printController.current?.abort(), []);
  useEffect(() => () => printController.current?.abort(), []);

  const api = useMemo<PdfViewerApi>(
    () => ({
      status,
      numPages,
      page: displayPage,
      scale,
      rotation,
      fullscreen,
      canZoomIn,
      canZoomOut,
      goToPage,
      nextPage,
      previousPage,
      zoomIn,
      zoomOut,
      setScale,
      resetZoom,
      rotate,
      toggleFullscreen,
      download,
      print,
      reload,
      getDocument: () => pdfDocument,
    }),
    [
      status,
      numPages,
      displayPage,
      scale,
      rotation,
      fullscreen,
      canZoomIn,
      canZoomOut,
      goToPage,
      nextPage,
      previousPage,
      zoomIn,
      zoomOut,
      setScale,
      resetZoom,
      rotate,
      toggleFullscreen,
      download,
      print,
      reload,
      pdfDocument,
    ],
  );
  useImperativeHandle(ref, () => api, [api]);
  useKeyboardShortcuts({
    enabled: keyboardShortcuts,
    element: rootElement,
    viewport: viewportElement,
    api,
  });

  // ── Render ───────────────────────────────────────────────────────────────
  const toolbarConfig = typeof toolbar === 'object' ? toolbar : undefined;
  const toolbarPosition = toolbarConfig?.position ?? 'bottom';
  const toolbarNode: ReactNode =
    toolbar === false ? null : (
      <div className="rpv-toolbar-wrapper">
        {renderToolbar ? (
          renderToolbar(api)
        ) : (
          <PdfToolbar
            api={api}
            labels={labels}
            config={toolbarConfig}
            compact={compact}
            locale={locale}
          />
        )}
      </div>
    );

  const renderPageError = useCallback(
    (pageError: PdfViewerError, actions: { retry: () => void }) =>
      renderError ? (
        renderError(pageError, actions)
      ) : (
        <ErrorView
          variant="page"
          message={pageError.message}
          retryLabel={labels.retry}
          onRetry={actions.retry}
        />
      ),
    [renderError, labels.retry],
  );

  const body: ReactNode =
    status === 'error' && error ? (
      <div className="rpv-error-area">
        {renderError ? (
          renderError(error, { retry: reload })
        ) : (
          <ErrorView message={error.message} retryLabel={labels.retry} onRetry={reload} />
        )}
      </div>
    ) : (
      <div
        ref={viewportRef}
        className="rpv-viewport"
        role="group"
        aria-label={labels.document}
        // Scrollable regions must be keyboard-focusable (WCAG 2.1.1).
        // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
        tabIndex={0}
      >
        {status === 'loading' &&
          (renderLoading ? renderLoading() : <LoadingView label={labels.loading} />)}
        {status === 'idle' &&
          (renderEmpty ? renderEmpty() : <p className="rpv-sr-only">{labels.empty}</p>)}
        {pdfDocument && (
          <PdfPageCanvas
            document={pdfDocument}
            page={displayPage}
            scale={scale}
            rotation={rotation}
            fit={fit}
            maxCanvasPixels={maxCanvasPixels}
            aria-label={labels.pageAriaLabel(displayPage, numPages, labelContext)}
            renderError={renderPageError}
            onRender={onPageRender}
            onError={handleError}
          />
        )}
      </div>
    );

  const overlay = presentation === 'overlay';
  const content = (
    <section
      ref={setRootElement}
      id={id}
      className={className ? `rpv-root ${className}` : 'rpv-root'}
      style={style}
      aria-label={ariaLabel ?? labels.viewer}
      role={overlay ? 'dialog' : undefined}
      aria-modal={overlay ? true : undefined}
      tabIndex={-1}
      data-status={status}
      data-compact={compact ? '' : undefined}
      data-fullscreen={presentation === 'none' ? undefined : ''}
      data-presentation={presentation === 'none' ? undefined : presentation}
      data-zoomed={scale > defaultScale && !scalesEqual(scale, defaultScale) ? '' : undefined}
      data-toolbar-position={toolbarPosition}
    >
      {toolbarPosition === 'top' && toolbarNode}
      {body}
      {toolbarPosition === 'bottom' && toolbarNode}
      {printProgress && (
        <div className="rpv-print-status" role="status">
          <Spinner />
          <p className="rpv-print-status__text">
            {labels.printProgress(printProgress.done, printProgress.total, labelContext)}
          </p>
          <button type="button" className="rpv-text-button" onClick={cancelPrint}>
            {labels.cancel}
          </button>
        </div>
      )}
    </section>
  );

  return overlay && isClient ? createPortal(content, window.document.body) : content;
});
