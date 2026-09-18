import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PageRenderInfo } from '../hooks/usePageRenderer.js';
import type { LabelContext, PdfViewerLabels } from '../labels.js';
import type { Rotation } from '../types.js';
import { PdfPageCanvas } from './PdfPageCanvas.js';

const THUMBNAIL_WIDTH = 112;
const INITIALLY_MOUNTED = 8;
/** How far beyond the visible part of the list thumbnails stay rendered. */
const MOUNT_MARGIN = '400px 0px';

interface Size {
  width: number;
  height: number;
}

const NO_SIZES: ReadonlyMap<number, Size> = new Map();

interface ThumbnailsProps {
  document: PDFDocumentProxy;
  numPages: number;
  page: number;
  rotation: Rotation;
  onSelect: (page: number) => void;
  labels: PdfViewerLabels;
  context: LabelContext;
}

function ThumbnailsImpl({
  document,
  numPages,
  page,
  rotation,
  onSelect,
  labels,
  context,
}: ThumbnailsProps) {
  const navRef = useRef<HTMLElement>(null);
  const items = useRef(new Map<number, HTMLLIElement>());
  const [mounted, setMounted] = useState<ReadonlySet<number>>(
    () => new Set(Array.from({ length: Math.min(numPages, INITIALLY_MOUNTED) }, (_, i) => i + 1)),
  );
  // Size of every rendered thumbnail, so a placeholder takes the space its thumbnail takes: its
  // own size once it has rendered, the latest rendered size before that. Sizes belong to one
  // document at one rotation.
  const [measured, setMeasured] = useState<{
    document: PDFDocumentProxy;
    rotation: Rotation;
    sizes: ReadonlyMap<number, Size>;
    latest: Size | undefined;
  }>(() => ({ document, rotation, sizes: new Map(), latest: undefined }));
  const current = measured.document === document && measured.rotation === rotation;
  const sizes = current ? measured.sizes : NO_SIZES;
  const latestSize = current ? measured.latest : undefined;

  const recordSize = useCallback(
    (info: PageRenderInfo) => {
      const rendered = items.current.get(info.page)?.querySelector<HTMLElement>('.rpv-page');
      if (!rendered || rendered.offsetWidth === 0 || rendered.offsetHeight === 0) return;
      const size = { width: rendered.offsetWidth, height: rendered.offsetHeight };
      setMeasured((state) => {
        const same = state.document === document && state.rotation === rotation;
        const known = same ? state.sizes.get(info.page) : undefined;
        if (known?.width === size.width && known.height === size.height) return state;
        return {
          document,
          rotation,
          sizes: new Map([...(same ? state.sizes : []), [info.page, size]]),
          latest: size,
        };
      });
    },
    [document, rotation],
  );

  // Only thumbnails near the visible part of the list are rendered: a long document holds a
  // handful of canvases, not one per page.
  useEffect(() => {
    const root = navRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const near = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNumber = Number((entry.target as HTMLElement).dataset['page']);
          if (entry.isIntersecting) near.add(pageNumber);
          else near.delete(pageNumber);
        }
        setMounted((mountedNow) =>
          mountedNow.size === near.size && [...near].every((n) => mountedNow.has(n))
            ? mountedNow
            : new Set(near),
        );
      },
      { root, rootMargin: MOUNT_MARGIN },
    );
    for (const item of items.current.values()) observer.observe(item);
    return () => observer.disconnect();
  }, [numPages]);

  // Keep the current page's thumbnail visible.
  useEffect(() => {
    const root = navRef.current;
    const item = items.current.get(page);
    if (!root || !item) return;
    const top = item.offsetTop - root.offsetTop;
    if (top < root.scrollTop || top + item.offsetHeight > root.scrollTop + root.clientHeight) {
      root.scrollTop = top - (root.clientHeight - item.offsetHeight) / 2;
    }
  }, [page]);

  return (
    <nav ref={navRef} className="rpv-thumbnails" aria-label={labels.thumbnails}>
      <ol className="rpv-thumbnails__list">
        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1;
          return (
            <li
              key={pageNumber}
              ref={(node) => {
                if (node) items.current.set(pageNumber, node);
                else items.current.delete(pageNumber);
              }}
              data-page={pageNumber}
            >
              <button
                type="button"
                className="rpv-thumbnail"
                aria-label={labels.pageAriaLabel(pageNumber, numPages, context)}
                aria-current={pageNumber === page ? 'page' : undefined}
                onClick={() => onSelect(pageNumber)}
              >
                {mounted.has(pageNumber) ? (
                  <PdfPageCanvas
                    document={document}
                    page={pageNumber}
                    rotation={rotation}
                    fit={{ width: THUMBNAIL_WIDTH + 2, upscale: true }}
                    maxCanvasPixels={1_000_000}
                    onRender={recordSize}
                  />
                ) : (
                  <span
                    className="rpv-thumbnail__placeholder"
                    style={sizes.get(pageNumber) ?? latestSize}
                  />
                )}
                <span className="rpv-thumbnail__number" aria-hidden="true">
                  {context.formatNumber(pageNumber)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Page thumbnails sidebar; thumbnails render only while they are near the visible area. */
export const Thumbnails = memo(ThumbnailsImpl);
