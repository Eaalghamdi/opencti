import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins truthy class names', () => {
    const includeB: boolean = false;
    expect(cn('a', includeB && 'b', 'c')).toBe('a c');
  });
  it('resolves conflicting Tailwind utilities, last one winning', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
