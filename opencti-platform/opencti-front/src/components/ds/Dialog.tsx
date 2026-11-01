import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { Dialog as BaseDialog } from '@base-ui-components/react/dialog';
import { cn } from './lib/cn';

export type DialogProps = {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function Dialog({ children, open, onOpenChange }: DialogProps) {
  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
    >
      {children}
    </BaseDialog.Root>
  );
}

export function DialogTrigger({ children }: { children: ReactNode }) {
  return <BaseDialog.Trigger render={children as ReactElement} />;
}

export function DialogPopup({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 bg-black/50" />
      <BaseDialog.Popup
        className={cn(
          'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-md)] p-6',
          className,
        )}
        {...props}
      >
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export function DialogHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <BaseDialog.Title className={className} {...props}>
      {children}
    </BaseDialog.Title>
  );
}

export function DialogDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <BaseDialog.Description className={className} {...props}>
      {children}
    </BaseDialog.Description>
  );
}

export function DialogFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-6 flex justify-end gap-2', className)} {...props}>
      {children}
    </div>
  );
}
