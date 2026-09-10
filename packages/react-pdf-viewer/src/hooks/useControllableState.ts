import { useCallback, useEffect, useRef, useState } from 'react';
import { isDevelopment } from '../core/env.js';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect.js';

/** Options for {@link useControllableState}. */
export interface UseControllableStateOptions<T> {
  /** The controlled value. `undefined` means uncontrolled. */
  value: T | undefined;
  /** Initial value while uncontrolled. */
  defaultValue: T | (() => T);
  /** Called with every change, in both controlled and uncontrolled mode. */
  onChange?: ((value: T) => void) | undefined;
  /** Prop name used in development warnings. */
  name?: string | undefined;
}

/** Setter returned by {@link useControllableState}; accepts a value or an updater function. */
export type SetControllableState<T> = (next: T | ((previous: T) => T)) => void;

/**
 * The value / defaultValue / onValueChange pattern. Internal state is used while `value` is
 * `undefined`; `onChange` fires whenever the value changes. The setter is stable. Values must not
 * be functions (a function argument is treated as an updater).
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
  name = 'value',
}: UseControllableStateOptions<T>): readonly [T, SetControllableState<T>] {
  const [internal, setInternal] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const latest = useRef({ current, isControlled, onChange });
  useIsomorphicLayoutEffect(() => {
    latest.current = { current, isControlled, onChange };
  });

  const wasControlled = useRef(isControlled);
  useEffect(() => {
    if (wasControlled.current !== isControlled && isDevelopment()) {
      const from = wasControlled.current ? 'controlled' : 'uncontrolled';
      const to = isControlled ? 'controlled' : 'uncontrolled';
      console.error(
        `[react-pdf-viewer] \`${name}\` changed from ${from} to ${to}. ` +
          'Decide between a controlled and an uncontrolled value for the lifetime of the component.',
      );
    }
    wasControlled.current = isControlled;
  }, [isControlled, name]);

  const setValue = useCallback<SetControllableState<T>>((next) => {
    const state = latest.current;
    const resolved =
      typeof next === 'function' ? (next as (previous: T) => T)(state.current) : next;
    if (Object.is(resolved, state.current)) {
      return;
    }
    // Let several updates in one event compose before the next render.
    state.current = resolved;
    if (!state.isControlled) {
      setInternal(resolved);
    }
    state.onChange?.(resolved);
  }, []);

  return [current, setValue] as const;
}
