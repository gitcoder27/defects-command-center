import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from '@/hooks/useMediaQuery';

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the initial match result and updates when the media query changes', () => {
    let listener: ((event: MediaQueryListEvent) => void) | undefined;
    const addEventListener = vi.fn((_event: string, callback: (event: MediaQueryListEvent) => void) => {
      listener = callback;
    });
    const removeEventListener = vi.fn();
    const matchMedia = vi.fn((query: string) => ({
      media: query,
      matches: query.includes('1024px'),
      addEventListener,
      removeEventListener,
    }));
    vi.stubGlobal('matchMedia', matchMedia);

    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(min-width: 1024px)');
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    act(() => {
      listener?.({ matches: false } as MediaQueryListEvent);
    });

    expect(result.current).toBe(false);

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
