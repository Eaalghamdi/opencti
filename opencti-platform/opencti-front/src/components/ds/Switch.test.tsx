import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';

describe('Switch', () => {
  it('toggles aria-checked and fires onCheckedChange on click', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Enabled" onCheckedChange={onCheckedChange} />);
    const el = screen.getByRole('switch', { name: 'Enabled' });
    expect(el).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(el);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles via keyboard (Space)', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Enabled" onCheckedChange={onCheckedChange} />);
    const el = screen.getByRole('switch', { name: 'Enabled' });
    el.focus();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('reflects aria-checked when controlled checked=true', () => {
    render(<Switch aria-label="Enabled" checked onCheckedChange={() => {}} />);
    const el = screen.getByRole('switch', { name: 'Enabled' });
    expect(el).toHaveAttribute('aria-checked', 'true');
  });

  it('does not toggle when disabled', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Enabled" disabled onCheckedChange={onCheckedChange} />);
    const el = screen.getByRole('switch', { name: 'Enabled' });
    expect(el).toHaveAttribute('data-disabled', '');
    await userEvent.click(el);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  // The plan's literal brief regex (/\b(pl|pr|ml|mr)-\d/) is too narrow: it misses
  // left-/right-, border-l/border-r, rounded-l/-r, and bracket-arbitrary values. The
  // thumb's sliding position must flip correctly under dir="rtl", so it has to be
  // driven by a logical (inset-inline-start-based) transform rather than a physical
  // left/right position or a hardcoded translate-x. This test asserts that directly,
  // instead of the narrower literal regex from the brief.
  it('positions the thumb using a logical (dir-aware) transform, not a physical translate-x/left/right', () => {
    const { container } = render(<Switch aria-label="Enabled" defaultChecked />);
    const root = screen.getByRole('switch', { name: 'Enabled' });
    // The thumb is the descendant span Base UI renders inside the root; the root
    // itself also carries data-checked/data-unchecked, so query for descendants only.
    const thumb = container.querySelector(
      '[data-checked] [data-checked], [data-unchecked] [data-unchecked], [data-checked] [data-unchecked], [data-unchecked] [data-checked]',
    ) as HTMLElement | null;
    expect(thumb).not.toBeNull();
    expect(thumb).not.toBe(root);
    const className = thumb!.className;

    // No hardcoded physical-direction positioning classes.
    expect(className).not.toMatch(/\btranslate-x-/);
    expect(className).not.toMatch(/\b(left|right)-\d/);
    expect(className).not.toMatch(/\b(left|right)-\[/);
    expect(className).not.toMatch(/\bborder-[lr]\b/);
    expect(className).not.toMatch(/\brounded-[lr]\b/);

    // Must reference the logical inset-inline-start property to be dir-aware.
    expect(className).toMatch(/inset-inline-start/);
  });
});
