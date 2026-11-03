import type { ReactElement, ReactNode } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui-components/react/tooltip';
import { cn } from './lib/cn';

export type TooltipProps = {
  trigger: ReactElement<Record<string, unknown>>;
  content: ReactNode;
};

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <BaseTooltip.Provider>{children}</BaseTooltip.Provider>;
}

export function Tooltip({ trigger, content }: TooltipProps) {
  // Nothing to show: render the trigger alone, the way MUI's Tooltip skips an empty
  // title, rather than an empty bordered bubble on hover.
  if (content === null || content === undefined || content === '') {
    return trigger;
  }
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={trigger} />
      <BaseTooltip.Portal>
        {/* Above MUI modal hosts (1300) - same overlay level and reason as ds/Select's, ds/Combobox's and ds/Menu's popups. */}
        <BaseTooltip.Positioner className="z-[var(--fds-z-overlay,1400)]">
          <BaseTooltip.Popup
            className={cn(
              'bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--border)] rounded-[var(--ds-radius-sm)] px-2 py-1 text-sm',
            )}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
