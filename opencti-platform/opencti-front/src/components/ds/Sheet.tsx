import type { HTMLAttributes, ReactNode } from 'react';
import { Dialog as BaseDialog } from '@base-ui-components/react/dialog';
import { cn } from './lib/cn';

export type SheetProps = {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function Sheet({ children, open, onOpenChange }: SheetProps) {
  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
    >
      {children}
    </BaseDialog.Root>
  );
}

export type SheetPopupProps = HTMLAttributes<HTMLDivElement> & {
  side?: 'inline-start' | 'inline-end';
};

export function SheetPopup({ className, children, side = 'inline-end', ...props }: SheetPopupProps) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 bg-black/50" />
      <BaseDialog.Popup
        className={cn(
          'fixed top-0 bottom-0 h-full w-96',
          side === 'inline-start' ? 'start-0' : 'end-0',
          'bg-[var(--card)] border border-[var(--border)] p-6',
          'transition-transform duration-200',
          className,
        )}
        {...props}
      >
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export function SheetHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function SheetTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <BaseDialog.Title className={className} {...props}>
      {children}
    </BaseDialog.Title>
  );
}

export function SheetDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <BaseDialog.Description className={className} {...props}>
      {children}
    </BaseDialog.Description>
  );
}

export function SheetFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-6 flex justify-end gap-2', className)} {...props}>
      {children}
    </div>
  );
}
