import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { Popover as BasePopover } from '@base-ui-components/react/popover';
import { cn } from './lib/cn';

export type PopoverProps = {
  trigger: ReactElement<Record<string, unknown>>;
  children: ReactNode;
};

export function Popover({ trigger, children }: PopoverProps) {
  return (
    <BasePopover.Root>
      <BasePopover.Trigger render={trigger} />
      {children}
    </BasePopover.Root>
  );
}

export function PopoverPopup({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner>
        <BasePopover.Popup
          className={cn(
            'bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--border)] rounded-[var(--ds-radius-md)] p-4 text-sm',
            className,
          )}
          {...props}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}
