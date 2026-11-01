import type { HTMLAttributes } from 'react';
import { cn } from './lib/cn';

export function Kbd({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      {...rest}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 font-mono text-xs',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
