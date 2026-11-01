import type { ComponentPropsWithoutRef } from 'react';
import { Switch as BaseSwitch } from '@base-ui-components/react/switch';
import { cn } from './lib/cn';

export type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  // Base UI's Switch.Root renders a <span> (plus a hidden <input>), not a <button>,
  // so the pass-through props are typed against Switch.Root itself. The props this
  // wrapper re-declares above (and `className`, which Base UI also allows as a
  // state function) are omitted so ours take precedence.
} & Omit<
  ComponentPropsWithoutRef<typeof BaseSwitch.Root>,
  'checked' | 'defaultChecked' | 'onCheckedChange' | 'disabled' | 'className' | 'children'
>;

export function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  className,
  ...rest
}: SwitchProps) {
  return (
    <BaseSwitch.Root
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      onCheckedChange={(next) => onCheckedChange?.(next)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-[var(--radius-full)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-[var(--primary)] data-[unchecked]:bg-[var(--muted)]',
        className,
      )}
      {...rest}
    >
      <BaseSwitch.Thumb
        className={cn(
          'pointer-events-none absolute top-0.5 block size-5 rounded-[var(--radius-full)] bg-white shadow transition-[inset-inline-start]',
          // Logical (dir-aware) sliding position: resting flush with the inline-start
          // edge, sliding to the inline-end edge when checked. Using
          // `inset-inline-start` (not `translate-x`/`left`/`right`) means this flips
          // correctly under dir="rtl" with no extra logic.
          '[inset-inline-start:0.125rem] data-[checked]:[inset-inline-start:calc(100%-1.375rem)]',
        )}
      />
    </BaseSwitch.Root>
  );
}
