import { memo, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { LabelContext, PdfViewerLabels } from '../labels.js';
import type { Rotation } from '../types.js';
import { PdfPageCanvas } from './PdfPageCanvas.js';

const THUMBNAIL_WIDTH = 112;
const INITIALLY_MOUNTED = 8;

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

  // Render thumbnails lazily as they scroll into view (and keep them once rendered).
  useEffect(() => {
    const root = navRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const shown = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => Number((entry.target as HTMLElement).dataset['page']));
        if (shown.length === 0) return;
        setMounted((current) => {
          if (shown.every((n) => current.has(n))) return current;
          return new Set([...current, ...shown]);
        });
      },
      { root, rootMargin: '200px 0px' },
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
                  />
                ) : (
                  <span className="rpv-thumbnail__placeholder" />
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

/** Page thumbnails sidebar; thumbnails render lazily as they scroll into view. */
export const Thumbnails = memo(ThumbnailsImpl);
