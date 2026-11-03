import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popover, PopoverPopup } from './Popover';

describe('Popover', () => {
  it('opens on trigger click and closes on outside click', async () => {
    render(
      <>
        <Popover trigger={<button>Open popover</button>}>
          <PopoverPopup>Popover body</PopoverPopup>
        </Popover>
        <div>outside</div>
      </>,
    );
    expect(screen.queryByText('Popover body')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Open popover'));
    expect(await screen.findByText('Popover body')).toBeInTheDocument();
    await userEvent.click(screen.getByText('outside'));
    expect(screen.queryByText('Popover body')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    render(
      <Popover trigger={<button>Open popover</button>}>
        <PopoverPopup>Popover body</PopoverPopup>
      </Popover>,
    );
    await userEvent.click(screen.getByText('Open popover'));
    await screen.findByText('Popover body');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Popover body')).not.toBeInTheDocument();
  });

  it('merges trigger props onto the caller-supplied element instead of nesting a button inside one', () => {
    const { container } = render(
      <Popover trigger={<button>Open popover</button>}>
        <PopoverPopup>Popover body</PopoverPopup>
      </Popover>,
    );
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });
});
