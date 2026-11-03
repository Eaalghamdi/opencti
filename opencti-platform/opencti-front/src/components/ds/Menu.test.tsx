import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuCheckboxItem, MenuSub, MenuSubTrigger, MenuSubContent } from './Menu';

function Example({
  onItemClick,
  checked = false,
  onCheckedChange,
}: {
  onItemClick?: () => void;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <Menu>
      <MenuTrigger>
        <button>Open menu</button>
      </MenuTrigger>
      <MenuContent>
        <MenuItem onClick={onItemClick}>Allow</MenuItem>
        <MenuCheckboxItem checked={checked} onCheckedChange={onCheckedChange}>
          Show column
        </MenuCheckboxItem>
      </MenuContent>
    </Menu>
  );
}

function SubmenuExample({ onNestedItemClick }: { onNestedItemClick?: () => void }) {
  return (
    <Menu>
      <MenuTrigger>
        <button>Open menu</button>
      </MenuTrigger>
      <MenuContent>
        <MenuSub>
          <MenuSubTrigger>More options</MenuSubTrigger>
          <MenuSubContent>
            <MenuItem onClick={onNestedItemClick}>Nested item</MenuItem>
          </MenuSubContent>
        </MenuSub>
      </MenuContent>
    </Menu>
  );
}

describe('Menu', () => {
  it('opens the menu content when the trigger is activated', async () => {
    render(<Example />);
    expect(screen.queryByText('Allow')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(await screen.findByText('Allow')).toBeInTheDocument();
  });

  it("calls the item's onClick when a MenuItem is activated", async () => {
    const onItemClick = vi.fn();
    render(<Example onItemClick={onItemClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const item = await screen.findByText('Allow');
    await userEvent.click(item);
    expect(onItemClick).toHaveBeenCalledTimes(1);
    // A plain MenuItem closes the menu on activation (Base UI's `closeOnClick`
    // default for Menu.Item is `true`).
    expect(screen.queryByText('Allow')).not.toBeInTheDocument();
  });

  it('MenuCheckboxItem reflects its checked prop and calls onCheckedChange on toggle', async () => {
    const onCheckedChange = vi.fn();
    render(<Example checked onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const checkboxItem = await screen.findByRole('menuitemcheckbox', { name: 'Show column' });
    expect(checkboxItem).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(checkboxItem);
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    // Unlike a plain MenuItem, a checkbox item does not close the menu on toggle
    // (Base UI's `closeOnClick` default for Menu.CheckboxItem is `false`), so a
    // caller can flip several checkboxes (e.g. column visibility) in one session.
    expect(screen.getByRole('menuitemcheckbox', { name: 'Show column' })).toBeInTheDocument();
  });

  it('MenuCheckboxItem closes the menu on toggle when closeOnClick is explicitly set, overriding its false default', async () => {
    const onCheckedChange = vi.fn();
    render(
      <Menu>
        <MenuTrigger>
          <button>Open menu</button>
        </MenuTrigger>
        <MenuContent>
          <MenuCheckboxItem checked={false} onCheckedChange={onCheckedChange} closeOnClick>
            Show column
          </MenuCheckboxItem>
        </MenuContent>
      </Menu>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const checkboxItem = await screen.findByRole('menuitemcheckbox', { name: 'Show column' });

    await userEvent.click(checkboxItem);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    // Unlike the default-false case above, this caller asked for closes-on-select behavior
    // (e.g. a single-select list of checkbox items), so the menu is gone after the click.
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Show column' })).not.toBeInTheDocument();
  });

  it('MenuSubTrigger opens a nested MenuSubContent on activation, and the nested item activates', async () => {
    const onNestedItemClick = vi.fn();
    render(<SubmenuExample onNestedItemClick={onNestedItemClick} />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    trigger.focus();

    await userEvent.keyboard('{Enter}'); // opens the root menu
    expect(await screen.findByText('More options')).toBeInTheDocument();
    expect(screen.queryByText('Nested item')).not.toBeInTheDocument();

    await userEvent.keyboard('{ArrowDown}'); // highlights the (only) submenu trigger
    await userEvent.keyboard('{Enter}'); // activates it, opening the nested submenu
    const nestedItem = await screen.findByText('Nested item');

    await userEvent.click(nestedItem);
    expect(onNestedItemClick).toHaveBeenCalledTimes(1);
  });

  it('is fully keyboard navigable: Tab to the trigger, Enter/Space to open, Arrow keys to move between items, Enter to activate', async () => {
    const onItemClick = vi.fn();
    render(<Example onItemClick={onItemClick} />);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();

    await userEvent.keyboard('{Enter}'); // opens the menu; "Allow" (the first item) is highlighted automatically
    const item = await screen.findByText('Allow');
    expect(item).toHaveAttribute('data-highlighted');
    await userEvent.keyboard('{ArrowDown}'); // moves the highlight onto "Show column"
    expect(item).not.toHaveAttribute('data-highlighted');
    await userEvent.keyboard('{ArrowUp}'); // moves it back onto "Allow"
    expect(item).toHaveAttribute('data-highlighted');
    await userEvent.keyboard('{Enter}'); // activates the highlighted item
    expect(onItemClick).toHaveBeenCalledTimes(1);
  });

  it('merges trigger props onto the caller-supplied element instead of nesting a button inside one', () => {
    const { container } = render(<Example />);
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });

  describe('MenuContent anchor override', () => {
    // jsdom has no real layout engine, so Floating UI's computed position always collapses to
    // the same "no size, origin" numbers unless something in the chain is given a concrete rect
    // to compute from. Mocking `getBoundingClientRect` on the anchor element supplies that,
    // without needing real pixel-perfect e2e layout.
    const rectAt = (x: number, y: number): DOMRect => ({
      x, y, top: y, left: x, right: x, bottom: y, width: 0, height: 0, toJSON: () => ({}),
    }) as DOMRect;

    // Base UI's `Menu.Positioner` renders a `role="menu"` popup nested one level inside its own
    // `role="presentation"` wrapper, which is the element Floating UI actually moves (it also
    // carries a `data-side` attribute, same as the inner popup, so the lookup has to go via the
    // popup's parent, not the nearest `[data-side]` ancestor - that would stop one level too
    // early, on the popup itself).
    const findPositioner = (popup: HTMLElement) => popup.closest('[role="menu"]')?.parentElement as HTMLElement;

    it("positions against the trigger when no `anchor` is given, preserving every other MenuContent caller's default", async () => {
      render(<Example />);
      const trigger = screen.getByRole('button', { name: 'Open menu' });
      trigger.getBoundingClientRect = () => rectAt(111, 222);

      await userEvent.click(trigger);
      const popup = await screen.findByText('Allow');
      const positioner = findPositioner(popup);
      expect(positioner).not.toBeNull();
      // Computed straight from the trigger's mocked rect (the default `side="bottom"`'s 4px
      // `sideOffset` only shifts the y axis, hence 222 here but not 111): proves this still
      // flows through Floating UI's default "anchor to the trigger" resolution when `anchor`
      // is omitted.
      expect(positioner.style.transform).toBe('translate(111px, 218px)');
    });

    it('positions against an externally supplied `anchor` instead, with no `MenuTrigger` of its own', async () => {
      const externalAnchor = document.createElement('div');
      externalAnchor.getBoundingClientRect = () => rectAt(333, 444);
      document.body.appendChild(externalAnchor);

      // Exactly DataTableHeaders.tsx's own shape: no `MenuTrigger` anywhere in this tree - the
      // menu's `open` state and its anchor are both driven externally.
      render(
        <Menu open>
          <MenuContent anchor={externalAnchor}>
            <MenuItem>Allow</MenuItem>
          </MenuContent>
        </Menu>,
      );

      const popup = await screen.findByText('Allow');
      const positioner = findPositioner(popup);
      expect(positioner).not.toBeNull();
      // Computed from the *external* anchor's mocked rect (not the trigger's, since there is
      // none) - proves the `anchor` prop actually reaches Base UI's Positioner.
      expect(positioner.style.transform).toBe('translate(333px, 440px)');

      externalAnchor.remove();
    });
  });
});
