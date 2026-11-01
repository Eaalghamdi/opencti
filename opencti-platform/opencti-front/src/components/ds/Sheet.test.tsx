import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet, SheetPopup, SheetTitle } from './Sheet';

describe('Sheet', () => {
  it('renders its content when open, and calls onOpenChange(false) on Escape', async () => {
    const onOpenChange = vi.fn();
    // Sheet.Root has no separate trigger prop in the spec's inventory — render it
    // already open via `open` for this test instead of a trigger click.
    render(
      <Sheet open onOpenChange={onOpenChange}>
        <SheetPopup><SheetTitle>Filters</SheetTitle></SheetPopup>
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('positions at the inline-end edge by default via logical CSS, not a physical side', () => {
    render(
      <Sheet open>
        <SheetPopup data-testid="popup"><SheetTitle>Filters</SheetTitle></SheetPopup>
      </Sheet>,
    );
    const className = screen.getByTestId('popup').className;
    expect(className).toMatch(/inset-inline-end|end-0/);
    expect(className).not.toMatch(/(?:^|\s)(?:left|right)-0(?:\s|$)/);
  });

  it('positions at the inline-start edge when side="inline-start"', () => {
    render(
      <Sheet open>
        <SheetPopup side="inline-start" data-testid="popup"><SheetTitle>Filters</SheetTitle></SheetPopup>
      </Sheet>,
    );
    const className = screen.getByTestId('popup').className;
    expect(className).toMatch(/inset-inline-start|start-0/);
    expect(className).not.toMatch(/(?:^|\s)(?:left|right)-0(?:\s|$)/);
  });
});
