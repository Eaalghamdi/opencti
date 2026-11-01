import type { ReactNode } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui-components/react/tooltip';
import { cn } from './lib/cn';

export type TooltipProps = {
  trigger: ReactNode;
  content: ReactNode;
};

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <BaseTooltip.Provider>{children}</BaseTooltip.Provider>;
}

export function Tooltip({ trigger, content }: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger>{trigger}</BaseTooltip.Trigger>
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner>
          <BaseTooltip.Popup
            className={cn(
              'bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1 text-sm',
            )}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
