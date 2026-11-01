import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeMode } from './useThemeMode';

describe('useThemeMode', () => {
  afterEach(() => {
    document.documentElement.classList.remove('light', 'dark');
  });

  it('reads the mode already on document.documentElement at mount', () => {
    document.documentElement.classList.add('dark');
    const { result } = renderHook(() => useThemeMode());
    expect(result.current).toBe('dark');
  });

  it('updates when the class changes after mount, without remounting', async () => {
    document.documentElement.classList.add('light');
    const { result } = renderHook(() => useThemeMode());
    expect(result.current).toBe('light');
    // The MutationObserver notification is delivered as a microtask, after this
    // synchronous block returns control to the event loop — so the update must be
    // awaited (async act), not asserted on right after a sync act().
    await act(async () => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    });
    expect(result.current).toBe('dark');
  });
});
