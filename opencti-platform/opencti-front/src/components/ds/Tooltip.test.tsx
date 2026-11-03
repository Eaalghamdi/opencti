import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip, TooltipProvider } from './Tooltip';

describe('Tooltip', () => {
  it('shows its content on hover and hides it on unhover', async () => {
    render(
      <TooltipProvider>
        <Tooltip trigger={<button>Hover me</button>} content="Tooltip body" />
      </TooltipProvider>,
    );
    expect(screen.queryByText('Tooltip body')).not.toBeInTheDocument();
    await userEvent.hover(screen.getByText('Hover me'));
    expect(await screen.findByText('Tooltip body')).toBeInTheDocument();
    await userEvent.unhover(screen.getByText('Hover me'));
    expect(screen.queryByText('Tooltip body')).not.toBeInTheDocument();
  });

  it('merges trigger props onto the caller-supplied element instead of nesting a button inside one', () => {
    const { container } = render(
      <TooltipProvider>
        <Tooltip trigger={<button>Hover me</button>} content="Tooltip body" />
      </TooltipProvider>,
    );
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });

  it('renders its popup above MUI modal hosts (same overlay z-index as Select/Combobox/Menu)', async () => {
    render(
      <TooltipProvider>
        <Tooltip trigger={<button>Hover me</button>} content="Tooltip body" />
      </TooltipProvider>,
    );
    await userEvent.hover(screen.getByText('Hover me'));
    const body = await screen.findByText('Tooltip body');
    expect(body.closest('[class*="z-[var(--fds-z-overlay,1400)]"]')).not.toBeNull();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
  ])('renders no popup at all on hover when content is %s, but still renders the trigger', async (_label, content) => {
    const { baseElement } = render(
      <TooltipProvider>
        <Tooltip trigger={<button>Hover me</button>} content={content} />
      </TooltipProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Hover me' });
    await userEvent.hover(trigger);
    // Wait past Base UI's 600ms default open delay (tooltip/utils/constants.js OPEN_DELAY),
    // so a would-be popup has had its full chance to appear before asserting it did not.
    await new Promise((resolve) => {
      setTimeout(resolve, 900);
    });
    expect(baseElement.querySelector('[class*="z-[var(--fds-z-overlay,1400)]"]')).toBeNull();
    expect(baseElement.querySelector('[class*="bg-[var(--popover)]"]')).toBeNull();
    expect(baseElement.querySelectorAll('button')).toHaveLength(1);
  });

  it('still opens normally with non-empty content such as 0', async () => {
    render(
      <TooltipProvider>
        <Tooltip trigger={<button>Hover me</button>} content={0} />
      </TooltipProvider>,
    );
    await userEvent.hover(screen.getByText('Hover me'));
    expect(await screen.findByText('0')).toBeInTheDocument();
  });
});
