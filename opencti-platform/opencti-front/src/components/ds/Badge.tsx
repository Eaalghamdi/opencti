import type { HTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from './lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[var(--ds-radius-full)] px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        solid: '',
        soft: '',
        outline: 'border bg-transparent',
        dot: 'bg-transparent',
      },
      color: {
        primary: '',
        secondary: '',
        success: '',
        warning: '',
        destructive: '',
        info: '',
      },
    },
    compoundVariants: [
      { variant: 'solid', color: 'primary', className: 'bg-[var(--primary)] text-white' },
      { variant: 'solid', color: 'secondary', className: 'bg-[var(--secondary)] text-white' },
      { variant: 'solid', color: 'success', className: 'bg-[var(--success)] text-white' },
      { variant: 'solid', color: 'warning', className: 'bg-[var(--warning)] text-white' },
      { variant: 'solid', color: 'destructive', className: 'bg-[var(--destructive)] text-white' },
      { variant: 'solid', color: 'info', className: 'bg-[var(--info)] text-white' },
      { variant: 'soft', color: 'primary', className: 'bg-[color-mix(in srgb,var(--primary)_16%,var(--card))] text-[var(--primary)]' },
      { variant: 'soft', color: 'secondary', className: 'bg-[color-mix(in srgb,var(--secondary)_16%,var(--card))] text-[var(--secondary)]' },
      { variant: 'soft', color: 'success', className: 'bg-[color-mix(in srgb,var(--success)_16%,var(--card))] text-[var(--success)]' },
      { variant: 'soft', color: 'warning', className: 'bg-[color-mix(in srgb,var(--warning)_16%,var(--card))] text-[var(--warning)]' },
      { variant: 'soft', color: 'destructive', className: 'bg-[color-mix(in srgb,var(--destructive)_16%,var(--card))] text-[var(--destructive)]' },
      { variant: 'soft', color: 'info', className: 'bg-[color-mix(in srgb,var(--info)_16%,var(--card))] text-[var(--info)]' },
      { variant: 'outline', color: 'primary', className: 'border-[var(--primary)] text-[var(--primary)]' },
      { variant: 'outline', color: 'secondary', className: 'border-[var(--secondary)] text-[var(--secondary)]' },
      { variant: 'outline', color: 'success', className: 'border-[var(--success)] text-[var(--success)]' },
      { variant: 'outline', color: 'warning', className: 'border-[var(--warning)] text-[var(--warning)]' },
      { variant: 'outline', color: 'destructive', className: 'border-[var(--destructive)] text-[var(--destructive)]' },
      { variant: 'outline', color: 'info', className: 'border-[var(--info)] text-[var(--info)]' },
      { variant: 'dot', color: 'primary', className: 'text-[var(--foreground)]' },
      { variant: 'dot', color: 'secondary', className: 'text-[var(--foreground)]' },
      { variant: 'dot', color: 'success', className: 'text-[var(--foreground)]' },
      { variant: 'dot', color: 'warning', className: 'text-[var(--foreground)]' },
      { variant: 'dot', color: 'destructive', className: 'text-[var(--foreground)]' },
      { variant: 'dot', color: 'info', className: 'text-[var(--foreground)]' },
    ],
    defaultVariants: {
      variant: 'solid',
      color: 'primary',
    },
  },
);

const dotColorClass: Record<NonNullable<BadgeProps['color']>, string> = {
  primary: 'bg-[var(--primary)]',
  secondary: 'bg-[var(--secondary)]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  destructive: 'bg-[var(--destructive)]',
  info: 'bg-[var(--info)]',
};

export type BadgeProps = {
  variant?: 'solid' | 'soft' | 'outline' | 'dot';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info';
} & HTMLAttributes<HTMLSpanElement>;

export function Badge({
  variant = 'solid',
  color = 'primary',
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span {...rest} className={cn(badgeVariants({ variant, color }), className)}>
      {variant === 'dot' && (
        <span aria-hidden="true" className={cn('inline-block size-2 rounded-[var(--ds-radius-full)]', dotColorClass[color])} />
      )}
      {children}
    </span>
  );
}
