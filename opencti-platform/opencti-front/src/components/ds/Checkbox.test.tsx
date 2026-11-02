import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders unchecked by default and calls onCheckedChange(true) when clicked', async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Select row" onCheckedChange={onCheckedChange} />);
    const el = screen.getByRole('checkbox', { name: 'Select row' });
    expect(el).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(el);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('renders checked when checked is true', () => {
    render(<Checkbox aria-label="Select row" checked onCheckedChange={() => {}} />);
    const el = screen.getByRole('checkbox', { name: 'Select row' });
    expect(el).toHaveAttribute('aria-checked', 'true');
  });

  it('renders an indeterminate visual state distinct from checked and unchecked', () => {
    const { rerender } = render(
      <Checkbox aria-label="Select all" checked={false} indeterminate onCheckedChange={() => {}} />,
    );
    const el = screen.getByRole('checkbox', { name: 'Select all' });
    expect(el).toHaveAttribute('aria-checked', 'mixed');
    expect(el).not.toHaveAttribute('data-checked');
    expect(el).not.toHaveAttribute('data-unchecked');

    rerender(<Checkbox aria-label="Select all" checked onCheckedChange={() => {}} />);
    expect(el).toHaveAttribute('aria-checked', 'true');

    rerender(<Checkbox aria-label="Select all" checked={false} onCheckedChange={() => {}} />);
    expect(el).toHaveAttribute('aria-checked', 'false');
  });

  it('is reachable and toggleable by keyboard (Tab to focus, Space to toggle)', async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Select row" onCheckedChange={onCheckedChange} />);
    const el = screen.getByRole('checkbox', { name: 'Select row' });
    expect(el).not.toHaveFocus();
    await userEvent.tab();
    expect(el).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('does not call onCheckedChange when disabled', async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Select row" disabled onCheckedChange={onCheckedChange} />);
    const el = screen.getByRole('checkbox', { name: 'Select row' });
    expect(el).toHaveAttribute('data-disabled', '');
    await userEvent.click(el);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
