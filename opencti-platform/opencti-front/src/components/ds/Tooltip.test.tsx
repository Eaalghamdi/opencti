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
});
