import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge color="success">deployed</Badge>);
    expect(screen.getByText('deployed')).toBeInTheDocument();
  });

  it.each(['solid', 'soft', 'outline', 'dot'] as const)('renders the %s variant without throwing', (variant) => {
    expect(() => render(<Badge variant={variant}>x</Badge>)).not.toThrow();
  });
});
