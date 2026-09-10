import { useEffect, useLayoutEffect } from 'react';

/** `useLayoutEffect` in the browser, `useEffect` on the server (avoids the SSR warning). */
export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;
