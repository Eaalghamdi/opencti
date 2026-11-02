import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('calls onPrevious when the previous control is activated', async () => {
    const onPrevious = vi.fn();
    render(<Pagination onPrevious={onPrevious} onNext={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when the next control is activated', async () => {
    const onNext = vi.fn();
    render(<Pagination onPrevious={vi.fn()} onNext={onNext} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables the previous control when previousDisabled is true, and it does not call onPrevious', async () => {
    const onPrevious = vi.fn();
    render(<Pagination onPrevious={onPrevious} onNext={vi.fn()} previousDisabled />);
    const previous = screen.getByRole('button', { name: 'Previous page' });
    expect(previous).toBeDisabled();
    await userEvent.click(previous);
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('disables the next control when nextDisabled is true, and it does not call onNext', async () => {
    const onNext = vi.fn();
    render(<Pagination onPrevious={vi.fn()} onNext={onNext} nextDisabled />);
    const next = screen.getByRole('button', { name: 'Next page' });
    expect(next).toBeDisabled();
    await userEvent.click(next);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('renders arbitrary children between the prev/next controls', () => {
    render(
      <Pagination onPrevious={vi.fn()} onNext={vi.fn()}>
        <span>1-25 of 100</span>
      </Pagination>,
    );
    const label = screen.getByText('1-25 of 100');
    const previous = screen.getByRole('button', { name: 'Previous page' });
    const next = screen.getByRole('button', { name: 'Next page' });
    expect(previous.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(label.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
