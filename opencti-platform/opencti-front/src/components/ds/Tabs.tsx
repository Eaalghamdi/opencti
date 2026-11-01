import type { HTMLAttributes, ReactNode } from 'react';
import { Tabs as BaseTabs } from '@base-ui-components/react/tabs';
import { cn } from './lib/cn';

export type TabsProps = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
};

export function Tabs({ defaultValue, value, onValueChange, children }: TabsProps) {
  return (
    <BaseTabs.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={(next) => onValueChange?.(next as string)}
    >
      {children}
    </BaseTabs.Root>
  );
}

export function TabsList({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <BaseTabs.List
      className={cn('relative inline-flex rounded-[var(--radius-md)] bg-[var(--muted)] p-1', className)}
      {...rest}
    />
  );
}

export type TabsTriggerProps = { value: string } & HTMLAttributes<HTMLButtonElement>;

export function TabsTrigger({ value, className, ...rest }: TabsTriggerProps) {
  return (
    <BaseTabs.Tab
      value={value}
      className={cn(
        'relative z-10 inline-flex items-center justify-center rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] data-[active]:text-[var(--foreground)]',
        className,
      )}
      {...rest}
    />
  );
}

export type TabsContentProps = { value: string } & HTMLAttributes<HTMLDivElement>;

export function TabsContent({ value, className, ...rest }: TabsContentProps) {
  return (
    <BaseTabs.Panel
      value={value}
      className={cn('mt-2', className)}
      {...rest}
    />
  );
}

export function TabsIndicator({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <BaseTabs.Indicator
      className={cn(
        'absolute z-0 rounded-[var(--radius-md)] bg-[var(--background)] shadow transition-all duration-200',
        // Physical left/top (not logical inset-inline-start/inset-block-start):
        // --active-tab-left/top/width/height are getBoundingClientRect-derived
        // physical measurements set by Base UI's TabsIndicator, already RTL-correct
        // because the browser computes them after RTL layout has run. Pairing an
        // already-physical, already-direction-aware value with a logical CSS
        // property would double-apply the direction flip and misplace the
        // indicator under dir="rtl". This is a deliberate, narrow exception to this
        // library's usual logical-property convention, not a regression of it.
        '[left:var(--active-tab-left)] [width:var(--active-tab-width)] [top:var(--active-tab-top)] [height:var(--active-tab-height)]',
        className,
      )}
      {...rest}
    />
  );
}
