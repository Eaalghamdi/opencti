import { createContext, useContext, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Select as BaseSelect } from '@base-ui-components/react/select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './lib/cn';

export type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
};

// Base UI's Select.Root sets an internal `forceMount` flag the first time the
// trigger is focused (a pre-render optimization) and again whenever the resolved
// value changes - see `SelectRoot.js`'s "Ensure the values and labels are
// registered..." effect - and never clears it. Once set, `Select.Portal` renders
// unconditionally and the popup is only ever hidden via the `hidden` attribute
// while closed, instead of being removed from the DOM the way this library's other
// overlays (Popover/Dialog/Tooltip) are. We track whether the popup should be in the
// React tree ourselves (`rendered`) and gate `SelectPopup` on it, so a closed Select
// actually unmounts its popup, matching the rest of this library's overlay contract.
//
// `rendered` is NOT simply "the open prop": it must flip to `true` synchronously
// with `open` (on `onOpenChange`) so the popup mounts for Base UI's own open-tracking
// to attach to, but it must only flip back to `false` from `onOpenChangeComplete`
// (fired after `open` goes `false`), not from `onOpenChange` itself. Root's own
// `useOpenChangeComplete` hook - which is what resets its *internal* store state
// (`mounted`, `activeIndex`, `transitionStatus`) - runs in a passive `useEffect`,
// strictly after the commit's synchronous ref-detach phase. If `SelectPopup`
// unmounted (and nulled `popupRef`) as soon as `onOpenChange(false)` fired, that
// effect would always find `popupRef.current === null` and Root's internal
// `mounted`/`transitionStatus` would get stuck forever after the *first* close -
// silently breaking a second open/close cycle and any future CSS enter/exit
// transition added to `SelectPopup` (the same pattern `Sheet.tsx` already uses for
// Dialog), which depends on `onOpenChangeComplete` firing correctly to know the exit
// animation has finished. Deferring our own unmount to `onOpenChangeComplete` lets
// Root's completion detection run first, against a still-mounted node.
const SelectRenderContext = createContext(false);

export function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  return (
    <BaseSelect.Root
      value={value}
      defaultValue={defaultValue}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setRendered(true);
        }
      }}
      onOpenChangeComplete={(completedOpen) => {
        if (!completedOpen) {
          setRendered(false);
        }
      }}
      onValueChange={(next) => onValueChange?.(next as string)}
    >
      <SelectRenderContext.Provider value={rendered}>{children}</SelectRenderContext.Provider>
    </BaseSelect.Root>
  );
}

export type SelectTriggerProps = HTMLAttributes<HTMLButtonElement> & { 'aria-label'?: string };

export function SelectTrigger({ className, children, ...rest }: SelectTriggerProps) {
  return (
    <BaseSelect.Trigger
      className={cn(
        'inline-flex items-center justify-between gap-2 bg-[var(--card)] border border-[var(--input-border)] rounded-[var(--radius-md)] px-3 py-2 text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {children}
      <BaseSelect.Icon>
        <ChevronDown className="size-4 shrink-0 text-[var(--muted-foreground)]" />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

export type SelectValueProps = { placeholder?: string };

export function SelectValue({ placeholder }: SelectValueProps) {
  // Base UI's Select.Value has no `placeholder` prop (it only exposes a
  // `placeholder: boolean` *state* for styling, via its `data-placeholder`
  // attribute) and its default rendering resolves an unset value to an empty
  // string rather than placeholder text. We supply the children render-function
  // instead to fall back to our own placeholder when nothing is selected yet.
  return (
    <BaseSelect.Value>
      {(value: string | null) => value ?? placeholder}
    </BaseSelect.Value>
  );
}

export type SelectPopupProps = { children: ReactNode };

export function SelectPopup({ children }: SelectPopupProps) {
  const rendered = useContext(SelectRenderContext);
  if (!rendered) {
    return null;
  }
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner>
        <BaseSelect.Popup
          className={cn(
            'bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--border)] rounded-[var(--radius-md)] p-1 text-sm',
          )}
        >
          {children}
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

export type SelectItemProps = { value: string; children: ReactNode };

export function SelectItem({ value, children }: SelectItemProps) {
  return (
    <BaseSelect.Item
      value={value}
      className="relative flex items-center gap-2 rounded-[var(--radius-md)] ps-2 pe-6 py-1.5 cursor-pointer select-none data-[highlighted]:bg-[var(--accent)] data-[highlighted]:text-[var(--accent-foreground)]"
    >
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
      <BaseSelect.ItemIndicator className="absolute end-2 flex items-center">
        <Check className="size-4" />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  );
}
