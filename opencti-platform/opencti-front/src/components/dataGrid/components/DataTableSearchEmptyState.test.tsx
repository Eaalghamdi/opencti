import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import DataTableSearchEmptyState from './DataTableSearchEmptyState';

vi.mock('../../i18n', () => ({
  useFormatter: () => ({
    t_i18n: (message: string, options?: { values?: Record<string, unknown> }) => {
      if (options?.values) {
        // Mirrors the real i18n helper's placeholder substitution closely enough for this
        // test: replace "{link}" with the provided React node.
        const { link } = options.values;
        return (
          <>
            {message.replace('{link}', '')}
            {link}
          </>
        );
      }
      return message;
    },
  }),
}));

const renderEmptyState = (rawSearchTerm: string | undefined) => render(
  <MemoryRouter>
    <DataTableSearchEmptyState rawSearchTerm={rawSearchTerm} />
  </MemoryRouter>,
);

describe('DataTableSearchEmptyState', () => {
  it('renders the generic "No results" message and its icon when there is no search term', () => {
    const { container } = renderEmptyState(undefined);

    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.queryByText(/Learn more about search options/)).not.toBeInTheDocument();

    const icon = container.querySelector('svg[data-testid="DoNotDisturbOnOutlinedIcon"]');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveStyle({ color: 'var(--text-default-disabled)' });
  });

  it('renders the term-specific message and a documentation link when a search term is given', () => {
    renderEmptyState('malware');

    expect(screen.getByText('No results for "malware"')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /our documentation/ });
    expect(link).toHaveAttribute('href', 'https://docs.opencti.io/latest/usage/search/#search-syntax');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('applies the expected design tokens to the message text, not a hardcoded color or MUI theme.palette value', () => {
    renderEmptyState(undefined);

    const title = screen.getByText('No results');
    expect(title).toHaveStyle({ color: 'var(--muted-foreground)' });
  });

  it('uses logical CSS properties (RTL-ready), never physical left/right, in its inline styles', () => {
    const { container } = renderEmptyState('malware');
    const styledElements = container.querySelectorAll('[style]');
    expect(styledElements.length).toBeGreaterThan(0);
    styledElements.forEach((element) => {
      const style = element.getAttribute('style') ?? '';
      expect(style).not.toMatch(/(?<![-\w])left\s*:/);
      expect(style).not.toMatch(/(?<![-\w])right\s*:/);
      expect(style).not.toMatch(/margin-left\s*:/);
      expect(style).not.toMatch(/margin-right\s*:/);
      expect(style).not.toMatch(/padding-left\s*:/);
      expect(style).not.toMatch(/padding-right\s*:/);
    });
  });
});
