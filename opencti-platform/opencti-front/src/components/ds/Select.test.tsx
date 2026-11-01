import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from './Select';

function Example({ onValueChange }: { onValueChange?: (v: string) => void }) {
  return (
    <Select onValueChange={onValueChange}>
      <SelectTrigger aria-label="Action">
        <SelectValue placeholder="Pick action" />
      </SelectTrigger>
      <SelectPopup>
        <SelectItem value="allow">allow</SelectItem>
        <SelectItem value="block">block</SelectItem>
      </SelectPopup>
    </Select>
  );
}

describe('Select', () => {
  it('opens on trigger click, selects an item on click, and closes', async () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Action' }));
    const option = await screen.findByText('allow');
    await userEvent.click(option);
    expect(onValueChange).toHaveBeenCalledWith('allow');
    expect(screen.queryByText('block')).not.toBeInTheDocument();
  });

  it('is operable via keyboard: Enter opens, ArrowDown moves, Enter selects', async () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    screen.getByRole('combobox', { name: 'Action' }).focus();
    await userEvent.keyboard('{Enter}{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenCalled();
  });

  // Regression guard: deferring our own unmount of SelectPopup to Base UI's
  // `onOpenChangeComplete` (instead of unmounting as soon as `onOpenChange(false)`
  // fires) is what lets Base UI's Select.Root correctly reset its own internal
  // `mounted`/`activeIndex`/`transitionStatus` state after a close. Unmounting too
  // early nulls `popupRef` before Root's completion-detection effect can run against
  // it, silently breaking every open/close cycle after the first. This test opens,
  // selects, closes, then reopens and selects again - the second cycle is the one
  // that was broken before the fix.
  it('can be reopened and reselected after closing', async () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Action' });

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByText('allow'));
    expect(onValueChange).toHaveBeenCalledWith('allow');
    expect(screen.queryByText('block')).not.toBeInTheDocument();

    await userEvent.click(trigger);
    const secondOption = await screen.findByText('block');
    await userEvent.click(secondOption);
    expect(onValueChange).toHaveBeenCalledWith('block');
    expect(screen.queryByText('allow')).not.toBeInTheDocument();
  });

  // Regression guard, narrower: unmounting SelectPopup before Base UI's Root
  // finishes its own close bookkeeping leaves its internal `activeIndex` stuck
  // pointing at whichever item was last highlighted, instead of being reset to
  // null. That doesn't affect which value gets selected, but it does leak a stale
  // `data-highlighted` (keyboard-focus-ring) state onto the wrong item the next
  // time the popup opens. Verified directly against this bug before the fix: with
  // the unmount wired off the raw `onOpenChange` instead of `onOpenChangeComplete`,
  // "block" below keeps `data-highlighted` set on reopen even though nothing was
  // ever selected.
  it('does not carry a stale keyboard highlight into the next open', async () => {
    render(<Example />);
    const trigger = screen.getByRole('combobox', { name: 'Action' });
    trigger.focus();

    await userEvent.keyboard('{Enter}');
    await screen.findByText('block');
    await userEvent.keyboard('{ArrowDown}'); // highlight moves onto "block"
    await userEvent.keyboard('{Escape}'); // closes without selecting

    await userEvent.click(trigger); // reopen
    const blockOption = await screen.findByText('block');
    expect(blockOption.closest('[role="option"]')).not.toHaveAttribute('data-highlighted');
  });
});
