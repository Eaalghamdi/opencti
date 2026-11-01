import type { HTMLAttributes } from 'react';
import { cn } from './lib/cn';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        'bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded-[var(--radius-md)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
