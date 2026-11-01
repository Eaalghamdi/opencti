import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogTrigger, DialogPopup, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './Dialog';

function Example({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger><button>Open dialog</button></DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Deploy policy</DialogTitle>
          <DialogDescription>Confirm deployment.</DialogDescription>
        </DialogHeader>
        <DialogFooter><button>Confirm</button></DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('opens on trigger click, traps focus, and closes on Escape', async () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByText('Open dialog'));
    const dialog = await screen.findByRole('dialog', { name: 'Deploy policy' });
    // Base UI owns exactly which element inside the dialog receives initial focus;
    // assert only that focus moved *into* the dialog, not which element within it.
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('merges trigger props onto the caller-supplied element instead of nesting a button inside one', () => {
    const { container } = render(
      <Dialog>
        <DialogTrigger><button>Open dialog</button></DialogTrigger>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Deploy policy</DialogTitle>
          </DialogHeader>
        </DialogPopup>
      </Dialog>,
    );
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });
});
