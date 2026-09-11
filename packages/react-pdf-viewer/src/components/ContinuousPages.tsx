import { memo, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { effectiveRotation, fitScale, type FitOptions } from '../core/geometry.js';
import type { Rotation } from '../types.js';

interface Size {
  width: number;
  height: number;
}

/** Page border width on both sides together (see `.rpv-page`). */
const PAGE_CHROME = 2;
const DEFAULT_SIZE: Size = { width: 612, height: 792 };

/** Scrolls `scroller` so `slot` sits at the top of its content box. */
function scrollToSlot(scroller: HTMLElement, slot: HTMLElement) {
  const padding = Number.parseFloat(getComputedStyle(scroller).paddingTop) || 0;
  scroller.scrollTop = slot.offsetTop - padding;
}

interface ContinuousPagesProps {
  document: PDFDocumentProxy;
  numPages: number;
  /** Current page; the list scrolls to it unless the change came from scrolling. */
  page: number;
  /** Reports the most visible page while the user scrolls. */
  onVisiblePageChange: (page: number) => void;
  scale: number;
  rotation: Rotation;
  fit: FitOptions | undefined;
  /** The scroll container. */
  scroller: HTMLElement | null;
  /** Renders one page at an explicit scale. */
  renderPage: (page: number, scale: number) => ReactNode;
}

/** Loads every page's size at scale 1 progressively (fetching a page does not render it). */
function usePageSizes(pdf: PDFDocumentProxy, numPages: number, rotation: Rotation) {
  const [state, setState] = useState<{ key: object; sizes: (Size | undefined)[] }>({
    key: pdf,
    sizes: [],
  });
  useEffect(() => {
    let cancelled = false;
    const sizes: (Size | undefined)[] = [];
    void (async () => {
      for (let index = 0; index < numPages && !cancelled; index++) {
        try {
          const page = await pdf.getPage(index + 1);
          const viewport = page.getViewport({
            scale: 1,
            rotation: effectiveRotation(page.rotate, rotation),
          });
          sizes[index] = { width: viewport.width, height: viewport.height };
        } catch {
          sizes[index] = undefined;
        }
        if (!cancelled && (index === 0 || index % 16 === 15 || index === numPages - 1)) {
          setState({ key: pdf, sizes: [...sizes] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, numPages, rotation]);
  return state.key === pdf ? state.sizes : [];
}

function ContinuousPagesImpl({
  document,
  numPages,
  page,
  onVisiblePageChange,
  scale,
  rotation,
  fit,
  scroller,
  renderPage,
}: ContinuousPagesProps) {
  const sizes = usePageSizes(document, numPages, rotation);
  const fallback = sizes.find(Boolean) ?? DEFAULT_SIZE;
  const slots = useRef(new Map<number, HTMLDivElement>());
  const [visible, setVisible] = useState<readonly number[]>([page]);
  const reported = useRef(page);
  const scrolledOnce = useRef(false);
  const reportRef = useRef(onVisiblePageChange);
  useLayoutEffect(() => {
    reportRef.current = onVisiblePageChange;
  });

  // Track which pages intersect the scroll container; only those (±1) get a canvas.
  useEffect(() => {
    if (!scroller || typeof IntersectionObserver === 'undefined') return;
    const ratios = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNumber = Number((entry.target as HTMLElement).dataset['page']);
          if (entry.isIntersecting) ratios.set(pageNumber, entry.intersectionRatio);
          else ratios.delete(pageNumber);
        }
        const inView = [...ratios.keys()].sort((a, b) => a - b);
        if (inView.length === 0) return;
        setVisible((current) =>
          current.length === inView.length && current.every((value, i) => value === inView[i])
            ? current
            : inView,
        );
        let best = inView[0] ?? 1;
        for (const candidate of inView) {
          if ((ratios.get(candidate) ?? 0) > (ratios.get(best) ?? 0)) best = candidate;
        }
        if (best !== reported.current) {
          reported.current = best;
          reportRef.current(best);
        }
      },
      { root: scroller, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    for (const slot of slots.current.values()) observer.observe(slot);
    return () => observer.disconnect();
  }, [scroller, numPages]);

  // Scroll to the page when navigation did not come from scrolling (buttons, keys, links, API).
  useLayoutEffect(() => {
    const slot = slots.current.get(page);
    if (!scroller || !slot) return;
    if (scrolledOnce.current && page === reported.current) return;
    scrolledOnce.current = true;
    reported.current = page;
    scrollToSlot(scroller, slot);
  }, [page, scroller]);

  const mounted = new Set<number>();
  if (typeof IntersectionObserver === 'undefined') {
    for (let n = Math.max(1, page - 1); n <= Math.min(numPages, page + 1); n++) mounted.add(n);
  } else {
    const first = Math.min(...visible);
    const last = Math.max(...visible);
    for (let n = Math.max(1, first - 1); n <= Math.min(numPages, last + 1); n++) mounted.add(n);
  }

  const fitBox =
    fit === undefined
      ? undefined
      : {
          width: fit.width === undefined ? undefined : fit.width - PAGE_CHROME,
          height: fit.height === undefined ? undefined : fit.height - PAGE_CHROME,
          upscale: fit.upscale,
        };

  return (
    <div className="rpv-pages">
      {Array.from({ length: numPages }, (_, index) => {
        const pageNumber = index + 1;
        const size = sizes[index] ?? fallback;
        const pageScale = fitScale(scale, size.width, size.height, fitBox);
        return (
          <div
            key={pageNumber}
            ref={(node) => {
              if (node) slots.current.set(pageNumber, node);
              else slots.current.delete(pageNumber);
            }}
            className="rpv-page-slot"
            data-page={pageNumber}
            style={{
              width: `${size.width * pageScale + PAGE_CHROME}px`,
              height: `${size.height * pageScale + PAGE_CHROME}px`,
            }}
          >
            {mounted.has(pageNumber) ? renderPage(pageNumber, pageScale) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Vertically scrolling pages; only the visible pages ±1 are rendered. */
export const ContinuousPages = memo(ContinuousPagesImpl);
