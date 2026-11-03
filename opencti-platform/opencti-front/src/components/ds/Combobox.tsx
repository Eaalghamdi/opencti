import { createContext, useContext, useMemo, useState, type ComponentPropsWithRef, type HTMLAttributes, type LabelHTMLAttributes, type ReactNode } from 'react';
import { Combobox as BaseCombobox, type ComboboxRootChangeEventReason } from '@base-ui-components/react/combobox';
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
  // The bordered `ComboboxField` box, registered by it on mount, so the popup can be
  // anchored to (and width-matched against) the whole field rather than Base UI's
  // default anchor, the bare `<input>` - which, beside chips and adornments, is only a
  // fraction of the field's width.
  fieldElement: HTMLElement | null;
  setFieldElement: (element: HTMLElement | null) => void;
};

const ComboboxContext = createContext<ComboboxContextValue>({
  rendered: false,
  loading: false,
  visibleOptions: [],
  isOptionEqualToValue: (a, b) => Object.is(a, b),
  fieldElement: null,
  setFieldElement: () => {},
});

/**
 * Why the input text changed - Base UI's own change reason, passed through verbatim
 * (see `ComboboxRoot.ChangeEventReason` in @base-ui-components/react). Only
 * `'input-change'` is the user typing (or browser autofill); the input text also
 * changes programmatically, e.g. `'item-press'` when a single-select fills the input
 * with the picked item's label, `'input-clear'` when a multi-select empties it on
 * close, `'clear-press'` for `ComboboxClear`, `'escape-key'` for an Escape-to-clear,
 * and `'none'` when the input is re-synced to the selected value.
 */
export type ComboboxInputChangeReason = ComboboxRootChangeEventReason;

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
   *
   * It fires for every input-text change, not only typing: check `reason` (see
   * `ComboboxInputChangeReason`) to tell real keystrokes (`'input-change'`) apart
   * from the programmatic fills/clears Base UI performs on selection and close.
   */
  onInputChange?: (value: string, reason: ComboboxInputChangeReason) => void;
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
  const [fieldElement, setFieldElement] = useState<HTMLElement | null>(null);

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
    fieldElement,
    setFieldElement,
  }), [rendered, loading, visibleOptions, isEqual, fieldElement]);

  // Never hand Base UI an `undefined` value. Its `useControlled` hook decides
  // controlled-vs-uncontrolled once, from the first render (`value !== undefined`),
  // and never re-evaluates it - so a caller whose value merely starts out
  // `undefined` (e.g. a Formik field with no key in `initialValues`) would lock the
  // combobox into uncontrolled mode for good, silently ignoring every later
  // `value` update (a `setFieldValue`, a form reset). `null`/`[]` mean the same
  // "nothing selected" while keeping the combobox controlled.
  const controlledValue = value ?? (multiple ? [] : null);

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
      // behavior is unaffected (`null` is "no selection" to Base UI too - but unlike
      // `undefined` it keeps the combobox controlled, see `controlledValue` above); this
      // cast only reconciles the narrower public type at the boundary.
      value={controlledValue as unknown as (Multiple extends true ? T[] : T) | undefined}
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
      onInputValueChange={(nextQuery, eventDetails) => {
        setQuery(nextQuery);
        onInputChange?.(nextQuery, eventDetails.reason);
      }}
    >
      <ComboboxContext.Provider value={contextValue}>{children}</ComboboxContext.Provider>
    </BaseCombobox.Root>
  );
}

export type ComboboxLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  /**
   * Appends a visual required marker (`*`) after the label text. The marker is
   * `aria-hidden`: the requirement itself is conveyed to assistive technology by the
   * input's own `required` attribute, so it is not announced twice. This mirrors the
   * marker MUI's `TextField`/`FormLabel` rendered for a `required` field (the `ds`
   * foundation's `Input`/`Select` have no label part, hence no prior convention).
   * @default false
   */
  required?: boolean;
};

export function ComboboxLabel({ className, children, required = false, ...rest }: ComboboxLabelProps) {
  return (
    <label className={cn('block text-sm font-medium text-[var(--foreground)] mb-1', className)} {...rest}>
      {children}
      {required && <span aria-hidden="true"> *</span>}
    </label>
  );
}

export type ComboboxFieldProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Marks the field invalid: the border switches to the `--destructive` token and the
   * box carries `data-invalid`. Pair it with `aria-invalid` on `ComboboxInput` and
   * `error` on `ComboboxHelperText` (the field box itself is presentational; the
   * input is what assistive technology reads). The border also follows an
   * `aria-invalid="true"` input on its own, matching `ds/Input`'s convention.
   * @default false
   */
  error?: boolean;
};

// The bordered input container - equivalent to AutocompleteField's TextField box.
// Houses Input/Trigger/Clear and, while `loading`, a trailing Spinner. The Spinner is
// rendered here (not inside ComboboxContent/the popup) so it stays visible whether or
// not the popup is open, matching MUI Autocomplete's loading affordance in its
// TextField endAdornment. It also registers itself as the popup's anchor (see
// `ComboboxContent`).
export function ComboboxField({ className, children, error = false, ...rest }: ComboboxFieldProps) {
  const { loading, setFieldElement } = useContext(ComboboxContext);
  return (
    <div
      ref={setFieldElement}
      data-invalid={error ? '' : undefined}
      className={cn(
        'inline-flex w-full items-center gap-2 bg-[var(--card)] border border-[var(--input-border)] rounded-[var(--ds-radius-md)] px-3 py-2 text-[var(--foreground)] focus-within:outline-2 focus-within:outline-[var(--ring)] has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed data-[invalid]:border-[var(--destructive)] has-[[aria-invalid=true]]:border-[var(--destructive)]',
        className,
      )}
      {...rest}
    >
      {children}
      {loading && <Spinner size="sm" />}
    </div>
  );
}

// Base UI's own input props (every native `<input>` attribute - `id`, `name`,
// `required`, `value`... - plus a forwarded `ref` to the real `<input>`, which React
// 19 passes to a function component as an ordinary prop). `className` is narrowed to
// the plain string this wrapper merges with its own classes; `render` is not exposed.
export type ComboboxInputProps = Omit<ComponentPropsWithRef<typeof BaseCombobox.Input>, 'className' | 'render' | 'children'> & {
  className?: string;
};

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
//
// Stacking: Base UI's Positioner sets no `z-index` of its own, and this popup is
// portaled to <body> - so without one it paints *behind* every MUI modal host
// (Popover 1300, Dialog/Drawer 1300) that a combobox commonly lives inside (filter
// chip popovers, creation drawers/dialogs). It takes the host's library-overlay level,
// `--fds-z-overlay` (design-system-host.css - set to 1400, above every MUI modal
// level, for exactly this case), with the same 1400 as a fallback where that sheet is
// not loaded.
//
// Sizing: anchored to the whole `ComboboxField` box (registered via context) rather
// than Base UI's default anchor, the bare `<input>`, so `--anchor-width` - one of the
// CSS variables Base UI's positioner sets on itself (ComboboxPositionerCssVars.js:
// --anchor-width, --available-height, ...) and which the popup inherits - is the
// field's width, as MUI's popper matched it. The height is capped at the space
// actually available below/above the anchor (and at 40vh, MUI's listbox cap), with
// the list scrolling inside: async callers fetch up to 100 options at once.
export function ComboboxContent({ children }: ComboboxContentProps) {
  const { rendered, fieldElement } = useContext(ComboboxContext);
  if (!rendered) {
    return null;
  }
  return (
    <BaseCombobox.Portal>
      <BaseCombobox.Positioner anchor={fieldElement ?? undefined} sideOffset={4} className="z-[var(--fds-z-overlay,1400)]">
        <BaseCombobox.Popup
          className={cn(
            'bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--border)] rounded-[var(--ds-radius-md)] p-1 text-sm',
            'w-[var(--anchor-width)] max-h-[min(var(--available-height),40vh)] overflow-y-auto overscroll-contain',
          )}
        >
          <ComboboxStatus />
          <BaseCombobox.List>{children}</BaseCombobox.List>
        </BaseCombobox.Popup>
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  );
}

export type ComboboxItemProps<T> = {
  value: T;
  disabled?: boolean;
  children: ReactNode;
  /**
   * The option's accessible name, when its content alone would not give a clean one -
   * e.g. a row whose content nests its own labelled control (a checkbox), which would
   * otherwise make the option's name the concatenation of that control's label and
   * the visible text.
   */
  'aria-label'?: string;
  /**
   * Omits the trailing selected-state check mark. For rows whose content already
   * carries its own selected affordance (e.g. a checkbox), so the selection is not
   * shown twice. The option's `aria-selected` is unaffected.
   * @default false
   */
  hideIndicator?: boolean;
};

export function ComboboxItem<T>({ value, disabled, children, 'aria-label': ariaLabel, hideIndicator = false }: ComboboxItemProps<T>) {
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
      aria-label={ariaLabel}
      className={cn(
        'relative flex items-center gap-2 rounded-[var(--ds-radius-md)] ps-2 py-1.5 cursor-pointer select-none data-[highlighted]:bg-[var(--muted)] data-[highlighted]:text-[var(--foreground)] data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
        hideIndicator ? 'pe-2' : 'pe-6',
      )}
    >
      {children}
      {!hideIndicator && (
        <BaseCombobox.ItemIndicator className="absolute end-2 flex items-center">
          <Check className="size-4" />
        </BaseCombobox.ItemIndicator>
      )}
    </BaseCombobox.Item>
  );
}

export type ComboboxGroupProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & { children: ReactNode };

// A group of options under one `ComboboxGroupLabel` - Base UI's own `Combobox.Group`
// (role="group", aria-labelledby pointing at its label's generated id), so assistive
// technology announces each option together with the group it belongs to. Place
// `ComboboxItem`s inside it in the same order as the `options` handed to `Combobox`:
// Base UI indexes items by document order for keyboard navigation.
export function ComboboxGroup({ className, children, ...rest }: ComboboxGroupProps) {
  return (
    <BaseCombobox.Group className={className} {...rest}>
      {children}
    </BaseCombobox.Group>
  );
}

export type ComboboxGroupLabelProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & { children: ReactNode };

export function ComboboxGroupLabel({ className, children, ...rest }: ComboboxGroupLabelProps) {
  return (
    <BaseCombobox.GroupLabel
      className={cn('px-2 py-1.5 text-xs font-medium text-[var(--muted-foreground)]', className)}
      {...rest}
    >
      {children}
    </BaseCombobox.GroupLabel>
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

export type ComboboxHelperTextProps = HTMLAttributes<HTMLParagraphElement> & {
  /**
   * Renders the text as a validation error, in the `--destructive` token rather than
   * the muted helper color. Give it an `id` and reference that from the input's
   * `aria-describedby` so the message is read with the field.
   * @default false
   */
  error?: boolean;
};

export function ComboboxHelperText({ className, children, error = false, ...rest }: ComboboxHelperTextProps) {
  return (
    <p
      data-invalid={error ? '' : undefined}
      className={cn('text-xs mt-1', error ? 'text-[var(--destructive)]' : 'text-[var(--muted-foreground)]', className)}
      {...rest}
    >
      {children}
    </p>
  );
}
