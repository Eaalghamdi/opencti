import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDesignTokens } from './useDesignTokens';

describe('useDesignTokens', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--primary');
  });

  it('resolves a CSS custom property set on the document root', () => {
    document.documentElement.style.setProperty('--primary', '#123456');
    const { result } = renderHook(() => useDesignTokens());
    expect(result.current.primary).toBe('#123456');
  });
});
