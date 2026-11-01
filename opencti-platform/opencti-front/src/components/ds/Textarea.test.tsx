import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('accepts typed input', async () => {
    render(<Textarea aria-label="Notes" />);
    const textarea = screen.getByLabelText('Notes');
    await userEvent.type(textarea, 'hello');
    expect(textarea).toHaveValue('hello');
  });

  it('forwards a ref to the underlying <textarea>', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} aria-label="Notes" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('renders disabled state natively', () => {
    render(<Textarea aria-label="Notes" disabled />);
    expect(screen.getByLabelText('Notes')).toBeDisabled();
  });

  it('uses no hardcoded left/right classes under dir="rtl"', () => {
    const { container } = render(<div dir="rtl"><Textarea aria-label="Notes" /></div>);
    const textarea = container.querySelector('textarea')!;
    expect(textarea.className).not.toMatch(/\b(pl|pr|ml|mr)-\d/);
  });
});
