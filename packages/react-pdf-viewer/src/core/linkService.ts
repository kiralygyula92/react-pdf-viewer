import type { PDFDocumentProxy } from 'pdfjs-dist';

type RefProxy = Parameters<PDFDocumentProxy['getPageIndex']>[0];

/** Navigation callbacks the link service needs from the viewer. */
export interface LinkNavigation {
  /** Go to a 1-based page. */
  goToPage: (page: number) => void;
  /** Current 1-based page (for named actions such as NextPage). */
  getPage: () => number;
}

/**
 * The subset of PDF.js's `PDFLinkService` that `AnnotationLayer` uses for links. External links
 * open in a new tab with `rel="noopener noreferrer"`; internal links navigate the viewer.
 * (PDF.js only passes URLs with safe protocols through to `addLinkAttributes`.)
 */
export function createLinkService(pdf: PDFDocumentProxy, navigation: LinkNavigation) {
  const resolvePage = async (destination: unknown): Promise<number | null> => {
    const explicit =
      typeof destination === 'string' ? await pdf.getDestination(destination) : destination;
    if (!Array.isArray(explicit) || explicit.length === 0) return null;
    const [target] = explicit as unknown[];
    if (typeof target === 'object' && target !== null) {
      try {
        return (await pdf.getPageIndex(target as RefProxy)) + 1;
      } catch {
        return null;
      }
    }
    return typeof target === 'number' && Number.isInteger(target) ? target + 1 : null;
  };

  return {
    externalLinkEnabled: true,
    isInPresentationMode: false,
    eventBus: { on: () => undefined, off: () => undefined, dispatch: () => undefined },
    addLinkAttributes(link: HTMLAnchorElement, url: string) {
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer nofollow';
      link.title = url;
    },
    getDestinationHash: () => '#',
    getAnchorUrl: () => '#',
    goToDestination(destination: unknown) {
      void resolvePage(destination).then((page) => {
        if (page !== null) navigation.goToPage(page);
      });
    },
    goToPage(page: number) {
      navigation.goToPage(page);
    },
    executeNamedAction(action: string) {
      const current = navigation.getPage();
      const target: Record<string, number> = {
        FirstPage: 1,
        LastPage: pdf.numPages,
        NextPage: current + 1,
        PrevPage: current - 1,
      };
      const page = target[action];
      if (page !== undefined) navigation.goToPage(page);
    },
    executeSetOCGState: () => undefined,
  };
}
