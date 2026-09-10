import { useEffect, useState } from 'react';

/** Becomes `true` once the element comes near the viewport (and stays true). */
export function useInView<T extends Element>(): [(node: T | null) => void, boolean] {
  const [node, setNode] = useState<T | null>(null);
  // Without IntersectionObserver, render immediately.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (!node || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setInView(true);
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, inView]);
  return [setNode, inView];
}
