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
});
