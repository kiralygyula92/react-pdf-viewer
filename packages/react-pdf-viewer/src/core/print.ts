import type { PDFDocumentProxy } from 'pdfjs-dist';

/** 150 DPI: print resolution relative to PDF points (72 per inch). */
const PRINT_SCALE = 150 / 72;

// Browsers without a blocking print() and without `afterprint` would otherwise keep the frame.
const PRINT_TIMEOUT_MS = 60_000;

/** Options for {@link printDocument}. */
export interface PrintOptions {
  /** Aborts page preparation (the print dialog itself cannot be cancelled). */
  signal?: AbortSignal | undefined;
  /** Called after each prepared page. */
  onProgress?: ((done: number, total: number) => void) | undefined;
  /** Render scale; default {@link PRINT_SCALE}. */
  scale?: number | undefined;
}

const PRINT_STYLES = `
html, body { margin: 0; padding: 0; height: 100%; }
.page {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
  break-after: page; page-break-after: always; break-inside: avoid; page-break-inside: avoid;
}
.page:last-child { break-after: auto; page-break-after: auto; }
img { display: block; max-width: 100%; max-height: 100%; }
`;

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) =>
      blob ? resolve(blob) : reject(new Error('Failed to encode a page for printing')),
    );
  });
}

/**
 * Prints a document without leaving the page: every page is rendered to an image at print
 * resolution inside a hidden iframe (one page per sheet, no margins), then the iframe's print
 * dialog opens. The iframe is removed after printing.
 */
export async function printDocument(
  pdf: PDFDocumentProxy,
  { signal, onProgress, scale = PRINT_SCALE }: PrintOptions = {},
): Promise<void> {
  const hostDocument = window.document;
  const iframe = hostDocument.createElement('iframe');
  iframe.className = 'rpv-print-frame';
  iframe.title = 'Print';
  iframe.tabIndex = -1;
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
  });
  hostDocument.body.append(iframe);

  const objectUrls: string[] = [];
  try {
    const frameWindow = iframe.contentWindow;
    const frameDocument = iframe.contentDocument;
    if (!frameWindow || !frameDocument) {
      throw new Error('The print frame is unavailable');
    }

    const total = pdf.numPages;
    const first = (await pdf.getPage(1)).getViewport({ scale: 1 });
    const style = frameDocument.createElement('style');
    style.textContent = `@page { size: ${first.width}pt ${first.height}pt; margin: 0; }${PRINT_STYLES}`;
    frameDocument.head.append(style);
    onProgress?.(0, total);

    for (let pageNumber = 1; pageNumber <= total; pageNumber++) {
      signal?.throwIfAborted();
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = hostDocument.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvas, viewport, intent: 'print' }).promise;
      const blob = await canvasToBlob(canvas);
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();

      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      const sheet = frameDocument.createElement('div');
      sheet.className = 'page';
      const image = frameDocument.createElement('img');
      image.alt = '';
      image.src = url;
      sheet.append(image);
      frameDocument.body.append(sheet);
      onProgress?.(pageNumber, total);
    }

    await Promise.all(
      [...frameDocument.images].map((image) =>
        typeof image.decode === 'function' ? image.decode().catch(() => undefined) : undefined,
      ),
    );
    signal?.throwIfAborted();

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, PRINT_TIMEOUT_MS);
      frameWindow.addEventListener(
        'afterprint',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      frameWindow.focus();
      frameWindow.print();
    });
  } finally {
    iframe.remove();
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}
