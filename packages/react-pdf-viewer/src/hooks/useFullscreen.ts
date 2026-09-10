import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { FullscreenMode } from '../types.js';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect.js';

/** How fullscreen is currently presented. */
export type FullscreenPresentation = 'none' | 'layout' | 'native' | 'overlay';

const subscribeNever = () => () => undefined;

function isNativeFullscreenSupported(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.fullscreenEnabled === true &&
    typeof HTMLElement.prototype.requestFullscreen === 'function'
  );
}

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function trapFocus(event: KeyboardEvent, container: HTMLElement): void {
  const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = focusable[0];
  const last = focusable.at(-1);
  const active = container.ownerDocument.activeElement;
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !container.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

interface UseFullscreenOptions {
  mode: FullscreenMode;
  active: boolean;
  setActive: (active: boolean) => void;
  element: HTMLElement | null;
}

/**
 * Presents fullscreen:
 * - `controlled`: layout only, the parent decides.
 * - `native`: the Fullscreen API on `element`; leaving it (e.g. with `Esc`) reports `false`.
 *   Falls back to `overlay` where element fullscreen is unavailable or refused.
 * - `overlay`: fixed full-viewport layer with a focus trap, scroll lock and `Esc` to close.
 */
export function useFullscreen({
  mode,
  active,
  setActive,
  element,
}: UseFullscreenOptions): FullscreenPresentation {
  const nativeSupported = useSyncExternalStore(
    subscribeNever,
    isNativeFullscreenSupported,
    () => false,
  );
  const [nativeRefused, setNativeRefused] = useState(false);
  const setActiveRef = useRef(setActive);
  useIsomorphicLayoutEffect(() => {
    setActiveRef.current = setActive;
  });

  const presentation: FullscreenPresentation = !active
    ? 'none'
    : mode === 'controlled'
      ? 'layout'
      : mode === 'native' && nativeSupported && !nativeRefused
        ? 'native'
        : 'overlay';

  useEffect(() => {
    if (presentation !== 'native' || !element) {
      return;
    }
    const doc = element.ownerDocument;
    if (doc.fullscreenElement !== element) {
      // Refused without a user gesture, or blocked by permissions policy.
      element.requestFullscreen().catch(() => setNativeRefused(true));
    }
    const handleChange = () => {
      if (doc.fullscreenElement !== element) {
        setActiveRef.current(false);
      }
    };
    doc.addEventListener('fullscreenchange', handleChange);
    return () => {
      doc.removeEventListener('fullscreenchange', handleChange);
      if (doc.fullscreenElement === element) {
        doc.exitFullscreen().catch(() => undefined);
      }
    };
  }, [presentation, element]);

  // A refusal only applies to the current fullscreen session.
  if (!active && nativeRefused) {
    setNativeRefused(false);
  }

  useEffect(() => {
    if (presentation !== 'overlay' || !element) {
      return;
    }
    const doc = window.document;
    const previousFocus = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
    const previousOverflow = doc.body.style.overflow;
    doc.body.style.overflow = 'hidden';
    element.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setActiveRef.current(false);
      } else if (event.key === 'Tab') {
        trapFocus(event, element);
      }
    };
    doc.addEventListener('keydown', handleKeyDown);
    return () => {
      doc.removeEventListener('keydown', handleKeyDown);
      doc.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [presentation, element]);

  return presentation;
}
