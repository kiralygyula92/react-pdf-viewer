import { useEffect, useState } from 'react';

/** Content-box size of an element, in CSS pixels. */
export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Tracks an element's content-box size with `ResizeObserver`. Returns a callback ref and the
 * size, which is `null` until the first measurement (and always on the server).
 */
export function useElementSize<T extends Element>(): [
  (node: T | null) => void,
  ElementSize | null,
] {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState<ElementSize | null>(null);

  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }
      const box = entry.contentBoxSize[0];
      const width = box ? box.inlineSize : entry.contentRect.width;
      const height = box ? box.blockSize : entry.contentRect.height;
      setSize((previous) =>
        previous && previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [setNode, size];
}
