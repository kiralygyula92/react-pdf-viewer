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
import { ContinuousPages } from './components/ContinuousPages.js';
import { ErrorView } from './components/ErrorView.js';
import { LoadingView, Spinner } from './components/LoadingView.js';
import { PageInput } from './components/PageInput.js';
import { PasswordPrompt } from './components/PasswordPrompt.js';
import { PdfPageCanvas } from './components/PdfPageCanvas.js';
import { SearchBar } from './components/SearchBar.js';
import { Thumbnails } from './components/Thumbnails.js';
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
import { useDocumentSearch } from './hooks/useDocumentSearch.js';
import { useElementSize } from './hooks/useElementSize.js';
import { useFullscreen } from './hooks/useFullscreen.js';
import { useIsomorphicLayoutEffect } from './hooks/useIsomorphicLayoutEffect.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import type { PageHighlight, PageRenderInfo } from './hooks/usePageRenderer.js';
import { usePdfDocument } from './hooks/usePdfDocument.js';
import { useLabelContext, useLabels } from './labels.js';
import type { PdfSource, PdfViewerApi, PdfViewerError, PdfViewerProps, Rotation } from './types.js';

const subscribeNever = () => () => undefined;

/** Where the pointer was over a page when wheel/pinch zoom started. */
interface ZoomAnchor {
  page: number;
  fx: number;
  fy: number;
  clientX: number;
  clientY: number;
}

async function openInNewTab(pdf: PDFDocumentProxy, source: PdfSource | null | undefined) {
  if (typeof source === 'string' || source instanceof URL) {
    window.open(source.toString(), '_blank', 'noopener,noreferrer');
    return;
  }
  const url = URL.createObjectURL(toPdfBlob(await pdf.getData()));
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Scrolls `element` into the middle of `scroller` if it is not fully visible. */
function revealWithin(scroller: HTMLElement, element: HTMLElement) {
  const box = element.getBoundingClientRect();
  const view = scroller.getBoundingClientRect();
  if (box.top < view.top || box.bottom > view.bottom) {
    scroller.scrollTop += box.top - view.top - (view.height - box.height) / 2;
  }
  if (box.left < view.left || box.right > view.right) {
    scroller.scrollLeft += box.left - view.left - (view.width - box.width) / 2;
  }
}

/**
 * A PDF viewer: one page at a time with a toolbar for zoom, navigation, fullscreen, rotation,
 * download and print. Default props give a classic single-page layout; every
 * additional feature (text layer, links, continuous layout, thumbnails, search, …) is opt-in.
 *
 * @example
 * ```tsx
 * import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
 * import '@kiralygyula92/react-pdf-viewer/styles.css';
 *
 * <PdfViewer source="/files/document.pdf" fileName="document.pdf" />
 * ```
 *
 * @cssClass rpv-root The root element. Add `rpv-theme-dark`, or `rpv-theme-auto` to follow the operating system, for the dark preset.
 * @cssAttribute data-status Document status: `idle`, `loading`, `ready` or `error`.
 * @cssAttribute data-layout The `layout` prop: `single` or `continuous`.
 * @cssAttribute data-compact Present while the viewport is narrower than `compactBreakpoint`.
 * @cssAttribute data-fullscreen Present in fullscreen, in any mode.
 * @cssAttribute data-presentation How fullscreen is presented: `layout` (controlled mode), `native` or `overlay`.
 * @cssAttribute data-zoomed Present while the scale is above `defaultScale`.
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
    password: passwordProp,
    pdfjsOptions,
    layout = 'single',
    textLayer = false,
    annotationLayer = false,
    pageInput = false,
    zoomReset = false,
    wheelZoom = false,
    passwordPrompt = false,
    renderPasswordPrompt,
    thumbnails = false,
    search = false,
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
  const continuous = layout === 'continuous';
  const showTextLayer = textLayer || search;

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

  const callbacks = useRef({ onDownload, onPrint, onError, onDocumentLoad, onPageRender });
  useIsomorphicLayoutEffect(() => {
    callbacks.current = { onDownload, onPrint, onError, onDocumentLoad, onPageRender };
  });

  // ── Document ─────────────────────────────────────────────────────────────
  // A password typed into the prompt applies to the source it was typed for.
  const [entered, setEntered] = useState<{
    source: PdfSource | null | undefined;
    password: string;
  } | null>(null);
  const password =
    passwordProp ?? (entered && Object.is(entered.source, source) ? entered.password : undefined);

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

  // A new source opens on `defaultPage`; an out-of-range page is clamped and reported.
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

  // ── Search ───────────────────────────────────────────────────────────────
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchState, setMatchState] = useState<{
    query: string;
    index: number | null;
    fromPage: number;
  }>({ query: '', index: null, fromPage: 1 });
  if (matchState.query !== searchQuery) {
    // A new query starts at the first match on or after the current page.
    setMatchState({ query: searchQuery, index: null, fromPage: displayPage });
  }
  const { matches, searching } = useDocumentSearch(search ? pdfDocument : null, searchQuery);
  const autoIndex = Math.max(
    0,
    matches.findIndex((match) => match.page >= matchState.fromPage),
  );
  const matchIndex =
    matches.length === 0 ? 0 : Math.min(matchState.index ?? autoIndex, matches.length - 1);
  const activeMatch = matches[matchIndex];
  const stepMatch = useCallback(
    (direction: 1 | -1) => {
      if (matches.length === 0) return;
      setMatchState((current) => ({
        ...current,
        index: (matchIndex + direction + matches.length) % matches.length,
      }));
    },
    [matches.length, matchIndex],
  );
  const activeMatchPage = activeMatch?.page;
  useEffect(() => {
    if (activeMatchPage !== undefined) goToPage(activeMatchPage);
  }, [activeMatchPage, matchIndex, searchQuery, goToPage]);

  const highlightFor = useCallback(
    (pageNumber: number): PageHighlight | undefined =>
      search && searchQuery.trim()
        ? {
            query: searchQuery,
            selected: activeMatch?.page === pageNumber ? activeMatch.index : null,
          }
        : undefined,
    [search, searchQuery, activeMatch],
  );
  const revealHighlight = useCallback(
    (element: HTMLElement) => {
      if (viewportElement) revealWithin(viewportElement, element);
    },
    [viewportElement],
  );

  // Ctrl/⌘ + F focuses the search field while focus is inside the viewer.
  useEffect(() => {
    if (!search || !rootElement) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    rootElement.addEventListener('keydown', handleKeyDown);
    return () => rootElement.removeEventListener('keydown', handleKeyDown);
  }, [search, rootElement]);

  // ── Wheel / pinch zoom ───────────────────────────────────────────────────
  const zoomAnchor = useRef<ZoomAnchor | null>(null);
  const latestView = useRef({ scale, zoom, displayPage });
  useIsomorphicLayoutEffect(() => {
    latestView.current = { scale, zoom, displayPage };
  });
  useEffect(() => {
    if (!wheelZoom || !viewportElement) return;
    let clearTimer: ReturnType<typeof setTimeout> | undefined;
    let gestureStart = 1;

    const anchorAt = (target: EventTarget | null, clientX: number, clientY: number) => {
      const pageElement =
        (target instanceof Element ? target.closest<HTMLElement>('.rpv-page') : null) ??
        viewportElement.querySelector<HTMLElement>('.rpv-page');
      if (!pageElement) {
        zoomAnchor.current = null;
        return;
      }
      const box = pageElement.getBoundingClientRect();
      const slot = pageElement.closest<HTMLElement>('.rpv-page-slot');
      zoomAnchor.current = {
        page: slot ? Number(slot.dataset['page']) : latestView.current.displayPage,
        fx: box.width ? (clientX - box.left) / box.width : 0,
        fy: box.height ? (clientY - box.top) / box.height : 0,
        clientX,
        clientY,
      };
      clearTimeout(clearTimer);
      clearTimer = setTimeout(() => {
        zoomAnchor.current = null;
      }, 1500);
    };

    // Ctrl/⌘ + wheel, which is also what trackpad pinch produces in Chromium and Firefox.
    const handleWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      anchorAt(event.target, event.clientX, event.clientY);
      const factor = Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.002));
      setScaleState((current) => normalizeScale(current * factor, latestView.current.zoom));
    };
    // Safari reports trackpad pinch as gesture events.
    const handleGestureStart = (event: Event) => {
      event.preventDefault();
      gestureStart = latestView.current.scale;
    };
    const handleGestureChange = (event: Event) => {
      event.preventDefault();
      const gesture = event as Event & { scale?: number; clientX?: number; clientY?: number };
      anchorAt(event.target, gesture.clientX ?? 0, gesture.clientY ?? 0);
      setScaleState(normalizeScale(gestureStart * (gesture.scale ?? 1), latestView.current.zoom));
    };

    viewportElement.addEventListener('wheel', handleWheel, { passive: false });
    viewportElement.addEventListener('gesturestart', handleGestureStart);
    viewportElement.addEventListener('gesturechange', handleGestureChange);
    return () => {
      clearTimeout(clearTimer);
      viewportElement.removeEventListener('wheel', handleWheel);
      viewportElement.removeEventListener('gesturestart', handleGestureStart);
      viewportElement.removeEventListener('gesturechange', handleGestureChange);
    };
  }, [wheelZoom, viewportElement, setScaleState]);

  // After a zoomed render, keep the point that was under the pointer under the pointer.
  const handleRender = useCallback(
    (info: PageRenderInfo) => {
      callbacks.current.onPageRender?.(info);
      const anchor = zoomAnchor.current;
      if (!anchor || anchor.page !== info.page || !viewportElement) return;
      const pageElement = continuous
        ? viewportElement.querySelector(`.rpv-page-slot[data-page="${info.page}"] > .rpv-page`)
        : viewportElement.querySelector('.rpv-page');
      if (!(pageElement instanceof HTMLElement)) return;
      const box = pageElement.getBoundingClientRect();
      viewportElement.scrollLeft += box.left + anchor.fx * box.width - anchor.clientX;
      viewportElement.scrollTop += box.top + anchor.fy * box.height - anchor.clientY;
    },
    [continuous, viewportElement],
  );

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
            zoomReset={zoomReset}
            menuPlacement={toolbarPosition === 'top' ? 'bottom' : 'top'}
            pageIndicator={
              pageInput ? (
                <PageInput
                  page={displayPage}
                  numPages={numPages}
                  label={labels.pageInput}
                  context={labelContext}
                  onCommit={goToPage}
                />
              ) : undefined
            }
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

  const renderContinuousPage = useCallback(
    (pageNumber: number, pageScale: number) =>
      pdfDocument ? (
        <PdfPageCanvas
          document={pdfDocument}
          page={pageNumber}
          scale={pageScale}
          rotation={rotation}
          maxCanvasPixels={maxCanvasPixels}
          textLayer={showTextLayer}
          annotationLayer={annotationLayer}
          highlight={highlightFor(pageNumber)}
          aria-label={labels.pageAriaLabel(pageNumber, numPages, labelContext)}
          renderError={renderPageError}
          onRender={handleRender}
          onError={handleError}
          onLinkNavigate={goToPage}
          onHighlight={revealHighlight}
        />
      ) : null,
    [
      pdfDocument,
      rotation,
      maxCanvasPixels,
      showTextLayer,
      annotationLayer,
      highlightFor,
      labels,
      numPages,
      labelContext,
      renderPageError,
      handleRender,
      handleError,
      goToPage,
      revealHighlight,
    ],
  );

  const passwordNeeded =
    passwordPrompt && (error?.code === 'PASSWORD_REQUIRED' || error?.code === 'INCORRECT_PASSWORD');
  const submitPassword = useCallback(
    (value: string) => {
      if (entered && Object.is(entered.source, source) && entered.password === value) {
        reload();
      } else {
        setEntered({ source, password: value });
      }
    },
    [entered, source, reload],
  );

  let main: ReactNode;
  if (status === 'error' && error) {
    main = (
      <div className="rpv-error-area">
        {passwordNeeded ? (
          renderPasswordPrompt ? (
            renderPasswordPrompt({
              incorrect: error.code === 'INCORRECT_PASSWORD',
              submit: submitPassword,
            })
          ) : (
            <div className="rpv-password-area">
              <PasswordPrompt
                labels={labels}
                incorrect={error.code === 'INCORRECT_PASSWORD'}
                onSubmit={submitPassword}
              />
            </div>
          )
        ) : renderError ? (
          renderError(error, { retry: reload })
        ) : (
          <ErrorView message={error.message} retryLabel={labels.retry} onRetry={reload} />
        )}
      </div>
    );
  } else {
    main = (
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
        {pdfDocument &&
          (continuous ? (
            <ContinuousPages
              document={pdfDocument}
              numPages={numPages}
              page={displayPage}
              onVisiblePageChange={goToPage}
              scale={scale}
              rotation={rotation}
              fit={fit}
              scroller={viewportElement}
              renderPage={renderContinuousPage}
            />
          ) : (
            <PdfPageCanvas
              document={pdfDocument}
              page={displayPage}
              scale={scale}
              rotation={rotation}
              fit={fit}
              maxCanvasPixels={maxCanvasPixels}
              textLayer={showTextLayer}
              annotationLayer={annotationLayer}
              highlight={highlightFor(displayPage)}
              aria-label={labels.pageAriaLabel(displayPage, numPages, labelContext)}
              renderError={renderPageError}
              onRender={handleRender}
              onError={handleError}
              onLinkNavigate={goToPage}
              onHighlight={revealHighlight}
            />
          ))}
      </div>
    );
  }

  const showThumbnails =
    thumbnails && pdfDocument !== null && !(compact && presentation === 'none');
  const body: ReactNode = showThumbnails ? (
    <div className="rpv-body">
      <Thumbnails
        document={pdfDocument}
        numPages={numPages}
        page={displayPage}
        rotation={rotation}
        onSelect={goToPage}
        labels={labels}
        context={labelContext}
      />
      {main}
    </div>
  ) : (
    main
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
      data-layout={layout}
      data-compact={compact ? '' : undefined}
      data-fullscreen={presentation === 'none' ? undefined : ''}
      data-presentation={presentation === 'none' ? undefined : presentation}
      data-zoomed={scale > defaultScale && !scalesEqual(scale, defaultScale) ? '' : undefined}
      data-toolbar-position={toolbarPosition}
    >
      {toolbarPosition === 'top' && toolbarNode}
      {search && (
        <SearchBar
          inputRef={searchInputRef}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          total={matches.length}
          current={matchIndex}
          searching={searching}
          onNext={() => stepMatch(1)}
          onPrevious={() => stepMatch(-1)}
          labels={labels}
          context={labelContext}
        />
      )}
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
