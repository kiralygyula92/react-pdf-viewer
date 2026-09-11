import { useEffect, useRef } from 'react';
import type { PdfViewerApi } from '../types.js';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect.js';

type Shortcut =
  | 'previousPage'
  | 'nextPage'
  | 'firstPage'
  | 'lastPage'
  | 'zoomIn'
  | 'zoomOut'
  | 'resetZoom'
  | 'rotateCw'
  | 'rotateCcw'
  | 'toggleFullscreen';

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/** Whether `element` can still scroll horizontally in `direction`. */
function canScrollX(element: HTMLElement | null, direction: -1 | 1): boolean {
  if (!element || element.scrollWidth <= element.clientWidth) {
    return false;
  }
  return direction < 0
    ? element.scrollLeft > 0
    : element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
}

/** Maps a key press to a viewer shortcut, or `null`. Exported for tests. */
export function getShortcut(event: KeyboardEvent, viewport: HTMLElement | null): Shortcut | null {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
    return null;
  }
  if (isEditable(event.target)) {
    return null;
  }
  // Shift + navigation keys extend a text selection.
  if (event.shiftKey && /^(Arrow|Page|Home|End)/.test(event.key)) {
    return null;
  }
  // The toolbar uses arrows/Home/End for its roving focus. This native listener runs before
  // React's handler, so the toolbar cannot stop the event in time; skip those keys here.
  const inToolbar =
    event.target instanceof Element && event.target.closest('[role="toolbar"]') !== null;
  if (inToolbar && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return null;
  }
  switch (event.key) {
    case 'PageUp':
      return 'previousPage';
    case 'PageDown':
      return 'nextPage';
    // Arrows scroll a zoomed page first, then change pages.
    case 'ArrowLeft':
      return canScrollX(viewport, -1) ? null : 'previousPage';
    case 'ArrowRight':
      return canScrollX(viewport, 1) ? null : 'nextPage';
    case 'Home':
      return 'firstPage';
    case 'End':
      return 'lastPage';
    case '+':
    case '=':
      return 'zoomIn';
    case '-':
    case '_':
      return 'zoomOut';
    case '0':
      return 'resetZoom';
    case 'r':
      return 'rotateCw';
    case 'R':
      return 'rotateCcw';
    case 'f':
    case 'F':
      return 'toggleFullscreen';
    default:
      return null;
  }
}

interface UseKeyboardShortcutsOptions {
  enabled: boolean;
  /** Shortcuts are active only while focus is inside this element. */
  element: HTMLElement | null;
  viewport: HTMLElement | null;
  api: PdfViewerApi;
}

/**
 * Viewer keyboard shortcuts (active while focus is inside the viewer): ←/→ and PageUp/PageDown
 * change pages, Home/End jump to the first/last page, `+`/`-` zoom, `0` resets zoom, `r`/`R`
 * rotate, `f` toggles fullscreen.
 */
export function useKeyboardShortcuts({
  enabled,
  element,
  viewport,
  api,
}: UseKeyboardShortcutsOptions): void {
  const latest = useRef({ api, viewport });
  useIsomorphicLayoutEffect(() => {
    latest.current = { api, viewport };
  });

  useEffect(() => {
    if (!enabled || !element) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const { api: viewer, viewport: scroller } = latest.current;
      const shortcut = getShortcut(event, scroller);
      if (!shortcut) {
        return;
      }
      event.preventDefault();
      switch (shortcut) {
        case 'previousPage':
          viewer.previousPage();
          break;
        case 'nextPage':
          viewer.nextPage();
          break;
        case 'firstPage':
          viewer.goToPage(1);
          break;
        case 'lastPage':
          viewer.goToPage(viewer.numPages);
          break;
        case 'zoomIn':
          viewer.zoomIn();
          break;
        case 'zoomOut':
          viewer.zoomOut();
          break;
        case 'resetZoom':
          viewer.resetZoom();
          break;
        case 'rotateCw':
          viewer.rotate('cw');
          break;
        case 'rotateCcw':
          viewer.rotate('ccw');
          break;
        case 'toggleFullscreen':
          viewer.toggleFullscreen();
          break;
      }
    };
    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [enabled, element]);
}
