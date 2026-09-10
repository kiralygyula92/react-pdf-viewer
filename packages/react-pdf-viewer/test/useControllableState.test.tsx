import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useControllableState } from '../src/hooks/useControllableState';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useControllableState (KI-05)', () => {
  it('KI-05: keeps internal state when uncontrolled and still reports changes', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: undefined, defaultValue: 1, onChange }),
    );
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    act(() => result.current[1]((previous) => previous + 1));
    expect(result.current[0]).toBe(3);
    expect(onChange.mock.calls).toEqual([[2], [3]]);
  });

  it('KI-05: defers to the parent when controlled', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useControllableState({ value, defaultValue: 1, onChange }),
      { initialProps: { value: 5 as number | undefined } },
    );
    act(() => result.current[1](6));
    expect(result.current[0]).toBe(5);
    expect(onChange).toHaveBeenCalledWith(6);
    rerender({ value: 6 });
    expect(result.current[0]).toBe(6);
  });

  it('does not report unchanged values and composes updates within one event', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: undefined, defaultValue: 1, onChange }),
    );
    act(() => {
      result.current[1](1);
      result.current[1]((previous) => previous + 1);
      result.current[1]((previous) => previous + 1);
    });
    expect(result.current[0]).toBe(3);
    expect(onChange.mock.calls).toEqual([[2], [3]]);
  });

  it('warns in development when switching between controlled and uncontrolled', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = renderHook(
      ({ value }) => useControllableState({ value, defaultValue: 1, name: 'page' }),
      { initialProps: { value: undefined as number | undefined } },
    );
    rerender({ value: 3 });
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('`page` changed from uncontrolled to controlled'),
    );
  });
});
