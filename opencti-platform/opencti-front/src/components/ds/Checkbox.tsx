import type { ComponentPropsWithoutRef, MouseEvent } from 'react';
import { Checkbox as BaseCheckbox } from '@base-ui-components/react/checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from './lib/cn';

export type CheckboxProps = {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  // Base UI's Checkbox.Root renders a <span> (plus a hidden <input>), not a
  // <button>, so the pass-through props are typed against Checkbox.Root itself.
  // The props this wrapper re-declares above (and `className`, which Base UI
  // also allows as a state function) are omitted so ours take precedence.
} & Omit<
  ComponentPropsWithoutRef<typeof BaseCheckbox.Root>,
  'checked' | 'indeterminate' | 'onCheckedChange' | 'disabled' | 'className' | 'children'
>;

export function Checkbox({
  checked,
  indeterminate,
  onCheckedChange,
  disabled,
  className,
  ...rest
}: CheckboxProps) {
  // Base UI's Checkbox.Root renders a <span> plus a visually hidden native <input> beside
  // it, and handles a click on the <span> by calling `.click()` on that <input>. That second,
  // programmatic click is its own event, and it bubbles from the <input> to every ancestor
  // independently of the <span>'s click - so a consumer stopping propagation of the
  // checkbox's click (e.g. a DataTable row checkbox inside a navigable/selectable row) could
  // not stop it, and the ancestor saw the click a second time. This wrapper stops only that
  // echo: the checkbox's own click still bubbles as before, and React's `onChange` (which
  // drives `onCheckedChange`) is a separate synthetic event fired on the <input> itself, so
  // it is unaffected. `display: contents` keeps the wrapper out of layout.
  const stopHiddenInputClick = (event: MouseEvent<HTMLSpanElement>) => {
    if ((event.target as Element).tagName === 'INPUT') {
      event.stopPropagation();
    }
  };

  return (
    // Not interactive itself: it only filters the hidden input's synthetic click on its way up.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <span className="contents" onClick={stopHiddenInputClick}>
      <BaseCheckbox.Root
        checked={checked}
        indeterminate={indeterminate}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange?.(next)}
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-[var(--ds-radius-sm)] border border-[var(--input-border)] bg-[var(--card)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[checked]:border-[var(--primary)] data-[checked]:bg-[var(--primary)] data-[indeterminate]:border-[var(--primary)] data-[indeterminate]:bg-[var(--primary)]',
          className,
        )}
        {...rest}
      >
        <BaseCheckbox.Indicator className="flex items-center justify-center text-[var(--primary-foreground)]">
          {indeterminate ? <Minus className="size-3" /> : <Check className="size-3" />}
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
    </span>
  );
}
