import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { Menu as BaseMenu } from '@base-ui-components/react/menu';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from './lib/cn';

// Unlike ds/Select.tsx and ds/Combobox.tsx, Base UI's Menu.Portal has no
// "forceMounted-and-never-reset" quirk to work around: reading
// MenuPortal.js directly shows `shouldRender = mounted || keepMounted`,
// with `mounted` read straight off the menu's own store and `keepMounted`
// defaulting to `false` - so a closed Menu (root or submenu) unmounts its
// popup on its own, the same way ds/Popover.tsx's plain
// `BasePopover.Portal` does. No extra `rendered` state is needed here.
export type MenuProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

export function Menu({ open, defaultOpen, onOpenChange, children }: MenuProps) {
  return (
    <BaseMenu.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
    >
      {children}
    </BaseMenu.Root>
  );
}

// Base UI's Menu.Trigger renders its own interactive `<button>` by default,
// so - exactly like ds/Popover.tsx's and ds/Dialog.tsx's triggers - a
// caller-supplied trigger element (e.g. a `ds/Button`) is merged onto it via
// `render`, not nested inside it as a child, to avoid a double-interactive-
// element DOM bug.
export type MenuTriggerProps = { children: ReactElement<Record<string, unknown>> };

export function MenuTrigger({ children }: MenuTriggerProps) {
  return <BaseMenu.Trigger render={children} />;
}

// The Portal/Positioner/Popup structure backing both `MenuContent` (the root
// menu's popup) and `MenuSubContent` (a submenu's popup) - Base UI reuses the
// same three parts for a submenu, wrapped in `Menu.SubmenuRoot` instead of
// `Menu.Root` (see `MenuSub` below); there is no distinct "sub content" part
// in the installed build. Styled like ds/Select.tsx's/ds/Combobox.tsx's
// listbox popups (same border/radius/shadow tokens, `p-1` list padding), per
// the brief - no new visual language.
function MenuPopupContent({ className, children, anchor, ...rest }: HTMLAttributes<HTMLDivElement> & { anchor?: Element | null }) {
  return (
    <BaseMenu.Portal>
      {/* Above MUI modal hosts (1300) - same overlay level and reason as ds/Select's and ds/Combobox's popups. */}
      <BaseMenu.Positioner sideOffset={4} anchor={anchor} className="z-[var(--fds-z-overlay,1400)]">
        <BaseMenu.Popup
          className={cn(
            'bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--border)] rounded-[var(--ds-radius-md)] p-1 text-sm',
            className,
          )}
          {...rest}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

export type MenuContentProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Overrides the popup's anchor from the default (the nearest MenuTrigger) to an arbitrary
   * DOM element. Needed when the element that actually opens the menu isn't a `MenuTrigger`
   * living in this menu's own render tree - e.g. DataTableHeaders.tsx anchors its
   * column menu (sort/filter) to whichever column header's own button (rendered by a sibling
   * component, DataTableHeader.tsx) was clicked.
   */
  anchor?: Element | null;
};

export function MenuContent({ anchor, ...props }: MenuContentProps) {
  return <MenuPopupContent anchor={anchor} {...props} />;
}

export type MenuItemProps = HTMLAttributes<HTMLDivElement> & { disabled?: boolean; closeOnClick?: boolean };

// Base UI's Menu.Item exposes an `onClick` handler (there is no separate
// `onSelect` prop on the installed build - confirmed by reading
// menu/item/MenuItem.d.ts), which this wrapper passes straight through via
// `...rest`. It closes the menu on activation by default (`closeOnClick`
// defaults to `true`), matching a plain action item. `closeOnClick` itself is
// typed explicitly (rather than left to flow through `...rest` untyped) so a
// caller that needs the non-default, stays-open behavior - e.g.
// DataTableHeaders.tsx's Sort Asc/Desc items - can ask for it without a cast.
export function MenuItem({ className, children, disabled, ...rest }: MenuItemProps) {
  return (
    <BaseMenu.Item
      disabled={disabled}
      className={cn(
        'relative flex items-center gap-2 rounded-[var(--ds-radius-md)] px-2 py-1.5 cursor-pointer select-none data-[highlighted]:bg-[var(--muted)] data-[highlighted]:text-[var(--foreground)] data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {children}
    </BaseMenu.Item>
  );
}

export type MenuCheckboxItemProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  closeOnClick?: boolean;
};

// Base UI's own Menu.CheckboxItem/CheckboxItemIndicator parts render this
// item's checked affordance - per the brief, `ds/Checkbox` is deliberately
// NOT imported or composed here, the same way ds/Select and ds/Combobox each
// render their own selected-state indicator rather than sharing one.
// `closeOnClick` defaults to `false` for Menu.CheckboxItem (unlike
// Menu.Item's `true`), so toggling one checkbox item leaves the menu open
// for toggling more - the behavior DataTablePagination.tsx's column-visibility
// submenu needs.
// `closeOnClick` is declared here (same as `MenuItemProps` above) so a
// caller can ask for the non-default, closes-on-select behavior without a
// cast - e.g. DataTablePagination.tsx's single-select rows-per-page/
// redirection-mode submenus, which render as checkbox items purely for the
// checked-state affordance but should still close the whole menu on pick.
// It is not destructured below: it rides through `...rest` straight onto
// Base UI's own `Menu.CheckboxItem`, which already supports it natively.
export function MenuCheckboxItem({
  className,
  children,
  checked,
  onCheckedChange,
  disabled,
  ...rest
}: MenuCheckboxItemProps) {
  return (
    <BaseMenu.CheckboxItem
      checked={checked}
      onCheckedChange={(next) => onCheckedChange?.(next)}
      disabled={disabled}
      className={cn(
        'relative flex items-center gap-2 rounded-[var(--ds-radius-md)] ps-2 pe-6 py-1.5 cursor-pointer select-none data-[highlighted]:bg-[var(--muted)] data-[highlighted]:text-[var(--foreground)] data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {children}
      <BaseMenu.CheckboxItemIndicator className="absolute end-2 flex items-center">
        <Check className="size-4" />
      </BaseMenu.CheckboxItemIndicator>
    </BaseMenu.CheckboxItem>
  );
}

// Base UI's real submenu API: `Menu.SubmenuRoot` (not "Sub") groups a
// submenu's trigger and popup and renders no element of its own, exactly
// like `Menu.Root` for the top-level menu - confirmed by reading
// menu/submenu-root/MenuSubmenuRoot.d.ts.
export type MenuSubProps = { children: ReactNode };

export function MenuSub({ children }: MenuSubProps) {
  return <BaseMenu.SubmenuRoot>{children}</BaseMenu.SubmenuRoot>;
}

export type MenuSubTriggerProps = HTMLAttributes<HTMLDivElement> & { disabled?: boolean };

// Base UI's `Menu.SubmenuTrigger` (not "SubTrigger") - confirmed by reading
// menu/submenu-trigger/MenuSubmenuTrigger.d.ts. It is itself a menu item
// (`role="menuitem"`, via the same `useMenuItem` hook `Menu.Item` uses), so
// it is styled the same way, plus a trailing chevron indicating a nested
// menu. It opens on hover by default (`openOnHover` defaults to `true`) and,
// independently of that, on keyboard activation (Enter/Space) - Base UI's
// `ignoreMouse` wiring for its click handler only ignores pointer-originated
// clicks while hover-opening is enabled, not keyboard-originated ones.
export function MenuSubTrigger({ className, children, disabled, ...rest }: MenuSubTriggerProps) {
  return (
    <BaseMenu.SubmenuTrigger
      disabled={disabled}
      className={cn(
        'flex items-center justify-between gap-2 rounded-[var(--ds-radius-md)] px-2 py-1.5 cursor-pointer select-none data-[highlighted]:bg-[var(--muted)] data-[highlighted]:text-[var(--foreground)] data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {children}
      <ChevronRight className="size-4 shrink-0 text-[var(--muted-foreground)]" />
    </BaseMenu.SubmenuTrigger>
  );
}

export type MenuSubContentProps = HTMLAttributes<HTMLDivElement>;

export function MenuSubContent(props: MenuSubContentProps) {
  return <MenuPopupContent {...props} />;
}
