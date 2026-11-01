import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders its children inside a bordered container', () => {
    render(<Card data-testid="card">content</Card>);
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.getByTestId('card').className).toMatch(/border/);
  });
});
