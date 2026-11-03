import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders a status role with a loading label', () => {
    render(<Spinner />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('accepts a custom label', () => {
    render(<Spinner label="Searching" />);
    expect(screen.getByRole('status', { name: 'Searching' })).toBeInTheDocument();
  });

  it.each(['sm', 'md'] as const)('renders the %s size without throwing', (size) => {
    expect(() => render(<Spinner size={size} />)).not.toThrow();
  });
});
