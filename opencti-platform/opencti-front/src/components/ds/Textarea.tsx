import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from './lib/cn';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'bg-[var(--card)] border border-[var(--input-border)] rounded-[var(--radius-md)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed aria-[invalid=true]:border-[var(--destructive)]',
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
