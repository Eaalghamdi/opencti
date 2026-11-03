import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Input } from './Input';

describe('Input', () => {
  it('accepts typed input', async () => {
    render(<Input aria-label="Name" />);
    const input = screen.getByLabelText('Name');
    await userEvent.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });

  it('forwards a ref to the underlying <input>', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="Name" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('renders disabled state natively', () => {
    render(<Input aria-label="Name" disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });

  it('uses no hardcoded left/right classes under dir="rtl"', () => {
    const { container } = render(<div dir="rtl"><Input aria-label="Name" /></div>);
    const input = container.querySelector('input')!;
    expect(input.className).not.toMatch(/\b(pl|pr|ml|mr)-\d/);
  });
});
