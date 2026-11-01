import type { ButtonHTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from './lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-full)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: '',
        secondary: '',
        destructive: '',
      },
      appearance: {
        solid: '',
        outline: '',
        ghost: '',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
      iconOnly: {
        true: 'px-0',
        false: '',
      },
    },
    compoundVariants: [
      { variant: 'primary', appearance: 'solid', className: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90' },
      { variant: 'secondary', appearance: 'solid', className: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90' },
      { variant: 'destructive', appearance: 'solid', className: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90' },
      { variant: 'primary', appearance: 'outline', className: 'border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--muted)]' },
      { variant: 'secondary', appearance: 'outline', className: 'border border-[var(--secondary)] text-[var(--secondary)] hover:bg-[var(--muted)]' },
      { variant: 'destructive', appearance: 'outline', className: 'border border-[var(--destructive)] text-[var(--destructive)] hover:bg-[var(--muted)]' },
      { variant: 'primary', appearance: 'ghost', className: 'text-[var(--primary)] hover:bg-[var(--muted)]' },
      { variant: 'secondary', appearance: 'ghost', className: 'text-[var(--secondary)] hover:bg-[var(--muted)]' },
      { variant: 'destructive', appearance: 'ghost', className: 'text-[var(--destructive)] hover:bg-[var(--muted)]' },
      { iconOnly: true, size: 'sm', className: 'size-8' },
      { iconOnly: true, size: 'md', className: 'size-10' },
      { iconOnly: true, size: 'lg', className: 'size-12' },
    ],
    defaultVariants: {
      variant: 'primary',
      appearance: 'solid',
      size: 'md',
      iconOnly: false,
    },
  },
);

type ButtonBaseProps = {
  variant?: 'primary' | 'secondary' | 'destructive';
  appearance?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export type ButtonProps
  = | (ButtonBaseProps & { iconOnly?: false })
    | (ButtonBaseProps & { iconOnly: true; 'aria-label': string });

export function Button({
  variant = 'primary',
  appearance = 'solid',
  size = 'md',
  loading = false,
  iconOnly = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(buttonVariants({ variant, appearance, size, iconOnly }), className)}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
