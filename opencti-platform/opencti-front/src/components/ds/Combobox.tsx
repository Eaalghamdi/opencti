import { createContext, useContext, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Combobox as BaseCombobox } from '@base-ui-components/react/combobox';
import { Check, ChevronDown, X } from 'lucide-react';
import { Spinner } from './Spinner';
import { cn } from './lib/cn';

// Base UI's Combobox.Root has the exact same quirk Select.Root does (see Select.tsx):
// its internal store sets `forceMounted` to `true` the first time the trigger is
// focused/clicked (ComboboxTrigger.js) or the selected value changes
// (AriaCombobox.js's "Ensure the values and labels are registered..." effect) and
// never resets it - confirmed by reading AriaCombobox.js and ComboboxPortal.js
// directly: `shouldRender = mounted || keepMounted || forceMounted`, with only one
// `store.set('forceMounted', true)` call anywhere in the source and no counterpart
// that ever sets it back to `false`. So, exactly like `ds/Select.tsx`, we must not
// gate our own popup's mount on the raw `onOpenChange` callback: unmounting
// `ComboboxContent` as soon as `onOpenChange(false)` fires would null the popup ref
// before Base UI's own `useOpenChangeComplete`-based completion detection (see
// ComboboxPopup.js, which calls `onOpenChangeComplete(true)` only once mounted) can
// run against a still-mounted node, permanently desyncing Root's internal
// `mounted`/`transitionStatus` after the first close. We track mount ourselves via
// `rendered`, flipping it to `true` synchronously with `open` (on `onOpenChange`) and
// back to `false` only from `onOpenChangeComplete(false)`.
type ComboboxContextValue = {
  rendered: boolean;
  loading: boolean;
  visibleOptions: readonly unknown[];
  isOptionEqualToValue: (a: unknown, b: unknown) => boolean;
};

const ComboboxContext = createContext<ComboboxContextValue>({
  rendered: false,
  loading: false,
  visibleOptions: [],
  isOptionEqualToValue: (a, b) => Object.is(a, b),
});

export type ComboboxProps<T, Multiple extends boolean = false> = {
  value: Multiple extends true ? T[] : T | null;
  onValueChange: (value: Multiple extends true ? T[] : T | null) => void;
  options: T[];
  getOptionLabel: (option: T) => string;
  isOptionEqualToValue?: (a: T, b: T) => boolean;
  /**
   * Called as the user types. When provided, the caller owns searching/filtering
   * (typically an async/remote fetch): Combobox trusts `options` verbatim and does
   * not additionally substring-filter it. Without it, Combobox filters `options`
   * itself locally by `getOptionLabel`, matching a plain local-data autocomplete.
   */
  onInputChange?: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
  /**
   * Enables multi-select: `value`/`onValueChange` become `T[]` and selecting an item
   * adds to (rather than replaces) the selection. Pair with `ComboboxChips`,
   * `ComboboxChip`, and `ComboboxChipRemove` to render one chip per selected value.
   * @default false
   */
  multiple?: Multiple;
  children: ReactNode;
};

export function Combobox<T, Multiple extends boolean = false>({
  value,
  onValueChange,
  options,
  getOptionLabel,
  isOptionEqualToValue,
  onInputChange,
  loading = false,
  disabled = false,
  multiple,
  children,
}: ComboboxProps<T, Multiple>) {
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [query, setQuery] = useState('');

  // Recomputed fresh from the current `options` prop on every render (never memoized
  // against a *previous* `options` reference) - Combobox must only ever render the
  // options it was most recently given, so a parent that correctly sequences its own
  // async fetch never sees a flash of stale options from this component itself.
  const visibleOptions = useMemo<T[]>(() => {
    if (onInputChange || query === '') {
      return options;
    }
    const needle = query.toLowerCase();
    return options.filter((option) => getOptionLabel(option).toLowerCase().includes(needle));
  }, [options, query, onInputChange, getOptionLabel]);

  const isEqual = isOptionEqualToValue ?? ((a: T, b: T) => Object.is(a, b));

  const contextValue = useMemo<ComboboxContextValue>(() => ({
    rendered,
    loading,
    visibleOptions,
    isOptionEqualToValue: (a, b) => isEqual(a as T, b as T),
  }), [rendered, loading, visibleOptions, isEqual]);

  return (
    <BaseCombobox.Root<T, Multiple>
      items={visibleOptions}
      filter={null}
      itemToStringLabel={getOptionLabel}
      isItemEqualToValue={isOptionEqualToValue}
      // Base UI's own `value` prop has no `null` branch in single-select mode
      // (`ComboboxValueType<Value, Multiple>` resolves to plain `Value`, not
      // `Value | null`), but this component's public contract uses `null` for
      // "nothing selected" - a pre-existing convention from the single-select core
      // (see `ComboboxProps.value` above), unaffected by adding `multiple`. Runtime
      // behavior is unchanged (Base UI treats `null`/`undefined` the same for "no
      // selection"; the single-select tests above pass `value={null}` already); this
      // cast only reconciles the narrower public type at the boundary.
      value={value as unknown as (Multiple extends true ? T[] : T) | undefined}
      onValueChange={(next) => onValueChange(next as typeof value)}
      multiple={multiple}
      disabled={disabled}
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
      onInputValueChange={(nextQuery) => {
        setQuery(nextQuery);
        onInputChange?.(nextQuery);
      }}
    >
      <ComboboxContext.Provider value={contextValue}>{children}</ComboboxContext.Provider>
    </BaseCombobox.Root>
  );
}

export type ComboboxLabelProps = HTMLAttributes<HTMLLabelElement>;

export function ComboboxLabel({ className, children, ...rest }: ComboboxLabelProps) {
  return (
    <label className={cn('block text-sm font-medium text-[var(--foreground)] mb-1', className)} {...rest}>
      {children}
    </label>
  );
}

export type ComboboxFieldProps = HTMLAttributes<HTMLDivElement>;

// The bordered input container - equivalent to AutocompleteField's TextField box.
// Houses Input/Trigger/Clear and, while `loading`, a trailing Spinner. The Spinner is
// rendered here (not inside ComboboxContent/the popup) so it stays visible whether or
// not the popup is open, matching MUI Autocomplete's loading affordance in its
// TextField endAdornment.
export function ComboboxField({ className, children, ...rest }: ComboboxFieldProps) {
  const { loading } = useContext(ComboboxContext);
  return (
    <div
      className={cn(
        'inline-flex w-full items-center gap-2 bg-[var(--card)] border border-[var(--input-border)] rounded-[var(--ds-radius-md)] px-3 py-2 text-[var(--foreground)] focus-within:outline-2 focus-within:outline-[var(--ring)] has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {children}
      {loading && <Spinner size="sm" />}
    </div>
  );
}

export type ComboboxInputProps = Omit<HTMLAttributes<HTMLInputElement>, 'children'>;

export function ComboboxInput({ className, ...rest }: ComboboxInputProps) {
  return (
    <BaseCombobox.Input
      className={cn(
        'flex-1 min-w-0 bg-transparent outline-none placeholder:text-[var(--muted-foreground)]',
        className,
      )}
      {...rest}
    />
  );
}

export type ComboboxTriggerProps = HTMLAttributes<HTMLButtonElement>;

export function ComboboxTrigger({ className, ...rest }: ComboboxTriggerProps) {
  return (
    <BaseCombobox.Trigger
      className={cn(
        'inline-flex shrink-0 items-center justify-center text-[var(--muted-foreground)] disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      <BaseCombobox.Icon>
        <ChevronDown className="size-4 shrink-0" />
      </BaseCombobox.Icon>
    </BaseCombobox.Trigger>
  );
}

export type ComboboxClearProps = HTMLAttributes<HTMLButtonElement>;

export function ComboboxClear({ className, ...rest }: ComboboxClearProps) {
  return (
    <BaseCombobox.Clear
      className={cn(
        'inline-flex shrink-0 items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
        className,
      )}
      {...rest}
    >
      <X className="size-4" />
    </BaseCombobox.Clear>
  );
}

// Carries a chip's own `disabled` (locked) flag down to a `ComboboxChipRemove`
// nested inside it, independent of Base UI's own `Combobox.Chip`/`ChipRemove`
// `disabled` state - which is wired only to the *whole combobox's* `disabled` prop
// (confirmed by reading ComboboxChip.js/ComboboxChipRemove.js: both read
// `selectors.disabled` off the shared root store, with no per-chip prop of their
// own). A locked chip is a per-item concept this design system adds on top; without
// this context, a caller who places `ComboboxChipRemove` inside a locked
// `ComboboxChip` would still get a working (removable) button.
const ComboboxChipStateContext = createContext<{ disabled: boolean }>({ disabled: false });

export type ComboboxChipsProps = HTMLAttributes<HTMLDivElement>;

// A plain container for the chip row: renders whatever children it is given, in
// order, with no per-item mapping of its own. This is what lets a caller interleave
// arbitrary sibling JSX (e.g. a between-chip AND/OR mode toggle) directly between
// `ComboboxChip` instances using ordinary React composition.
export function ComboboxChips({ className, children, ...rest }: ComboboxChipsProps) {
  return (
    <BaseCombobox.Chips className={cn('flex flex-wrap items-center gap-1', className)} {...rest}>
      {children}
    </BaseCombobox.Chips>
  );
}

export type ComboboxChipProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /**
   * Renders a non-removable, visually distinct "locked" chip: no `ComboboxChipRemove`
   * is rendered inside it (even if one is passed as a child - see
   * `ComboboxChipStateContext` above) and Backspace/Delete while it is focused is
   * suppressed, since Base UI's own chip only guards removal behind the combobox's
   * global `disabled`, not a per-chip flag.
   * @default false
   */
  disabled?: boolean;
  /** The chip's own displayed content (e.g. a label string, or a nested `Tag`) - the same children-as-content convention as `ds/Badge`. */
  children: ReactNode;
};

export function ComboboxChip({ disabled = false, className, children, ...rest }: ComboboxChipProps) {
  const chipState = useMemo(() => ({ disabled }), [disabled]);
  return (
    <ComboboxChipStateContext.Provider value={chipState}>
      <BaseCombobox.Chip
        aria-disabled={disabled || undefined}
        className={cn(
          'inline-flex items-center gap-1 rounded-[var(--ds-radius-sm)] bg-[var(--muted)] px-2 py-0.5 text-sm text-[var(--foreground)]',
          disabled && 'border border-[var(--border)] bg-transparent text-[var(--muted-foreground)] cursor-not-allowed',
          className,
        )}
        onKeyDown={(event) => {
          if (disabled && (event.key === 'Backspace' || event.key === 'Delete')) {
            event.preventBaseUIHandler();
          }
        }}
        {...rest}
      >
        {children}
      </BaseCombobox.Chip>
    </ComboboxChipStateContext.Provider>
  );
}

export type ComboboxChipRemoveProps = HTMLAttributes<HTMLButtonElement>;

// Renders nothing when its enclosing `ComboboxChip` is `disabled` - a locked chip has
// no remove control, regardless of whether a caller still placed one as a child.
export function ComboboxChipRemove({ className, ...rest }: ComboboxChipRemoveProps) {
  const { disabled } = useContext(ComboboxChipStateContext);
  if (disabled) {
    return null;
  }
  return (
    <BaseCombobox.ChipRemove
      className={cn(
        'inline-flex shrink-0 items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
        className,
      )}
      {...rest}
    >
      <X className="size-3" />
    </BaseCombobox.ChipRemove>
  );
}

export type ComboboxStatusProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & { children?: ReactNode };

// An `aria-live="polite"` region (role="status"/aria-atomic, set by Base UI's own
// Combobox.Status) for announcing the state of an asynchronously loaded list to
// screen readers - the a11y counterpart to the visual Spinner in ComboboxField.
// Base UI's part is content-agnostic (it has no built-in notion of "loading"); this
// wrapper defaults its announcement to "Loading..." while `loading` is true and
// empty otherwise, but a caller can still override via `children` (e.g. to announce
// a result count instead).
export function ComboboxStatus({ className, children, ...rest }: ComboboxStatusProps) {
  const { loading } = useContext(ComboboxContext);
  return (
    <BaseCombobox.Status className={cn('sr-only', className)} {...rest}>
      {children ?? (loading ? 'Loading...' : null)}
    </BaseCombobox.Status>
  );
}

export type ComboboxContentProps = { children: ReactNode };

// The listbox popup - mirrors ds/Select.tsx's SelectPopup token usage and
// Portal/Positioner/Popup structure, gated on `rendered` for the same reason
// SelectPopup is (see the comment on ComboboxContext above). ComboboxStatus is
// wired in here automatically (alongside List, where Empty is also expected to be
// placed by the caller) so every Combobox announces its async loading state to
// screen readers without every call site having to remember to add it.
export function ComboboxContent({ children }: ComboboxContentProps) {
  const { rendered } = useContext(ComboboxContext);
  if (!rendered) {
    return null;
  }
  return (
    <BaseCombobox.Portal>
      <BaseCombobox.Positioner>
        <BaseCombobox.Popup
          className={cn(
            'bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--border)] rounded-[var(--ds-radius-md)] p-1 text-sm',
          )}
        >
          <ComboboxStatus />
          <BaseCombobox.List>{children}</BaseCombobox.List>
        </BaseCombobox.Popup>
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  );
}

export type ComboboxItemProps<T> = { value: T; disabled?: boolean; children: ReactNode };

export function ComboboxItem<T>({ value, disabled, children }: ComboboxItemProps<T>) {
  const { visibleOptions, isOptionEqualToValue } = useContext(ComboboxContext);
  // Base UI never hides statically-authored `<Combobox.Item>` children on its own
  // (confirmed by reading ComboboxItem.js/ComboboxList.js: filtering only affects its
  // internal `filteredItems` bookkeeping, used for the Empty/virtualization state -
  // it does not un-render children the app chose to mount). So this wrapper, not Base
  // UI, decides whether an item is part of the current visible set.
  const visible = visibleOptions.some((option) => isOptionEqualToValue(option, value));
  if (!visible) {
    return null;
  }
  return (
    <BaseCombobox.Item
      value={value}
      disabled={disabled}
      className="relative flex items-center gap-2 rounded-[var(--ds-radius-md)] ps-2 pe-6 py-1.5 cursor-pointer select-none data-[highlighted]:bg-[var(--muted)] data-[highlighted]:text-[var(--foreground)] data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
    >
      {children}
      <BaseCombobox.ItemIndicator className="absolute end-2 flex items-center">
        <Check className="size-4" />
      </BaseCombobox.ItemIndicator>
    </BaseCombobox.Item>
  );
}

export type ComboboxEmptyProps = { children: ReactNode };

export function ComboboxEmpty({ children }: ComboboxEmptyProps) {
  return (
    <BaseCombobox.Empty className="px-2 py-1.5 text-sm text-[var(--muted-foreground)]">
      {children}
    </BaseCombobox.Empty>
  );
}

export type ComboboxHelperTextProps = HTMLAttributes<HTMLParagraphElement>;

export function ComboboxHelperText({ className, children, ...rest }: ComboboxHelperTextProps) {
  return (
    <p className={cn('text-xs text-[var(--muted-foreground)] mt-1', className)} {...rest}>
      {children}
    </p>
  );
}
