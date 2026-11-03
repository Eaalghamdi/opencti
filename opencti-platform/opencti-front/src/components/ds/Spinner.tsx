import type { SVGAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from './lib/cn';

// Sizes use Tailwind's spacing scale (resolved through the theme's `--spacing` token),
// not literal pixel values.
const spinnerVariants = cva(
  'inline-block shrink-0 animate-spin text-[var(--primary)]',
  {
    variants: {
      size: {
        sm: 'size-4',
        md: 'size-6',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export type SpinnerProps = {
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
} & Omit<SVGAttributes<SVGSVGElement>, 'children'>;

export function Spinner({
  size = 'md',
  label = 'Loading',
  className,
  ...rest
}: SpinnerProps) {
  return (
    <svg
      {...rest}
      role="status"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      className={cn(spinnerVariants({ size }), className)}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
