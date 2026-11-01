import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DesignInspector } from './DesignInspector';

describe('DesignInspector', () => {
  it('renders one example of every Foundation-phase primitive without throwing', () => {
    render(<DesignInspector />);
    for (const label of [
      'Buttons', 'Inputs', 'Switch', 'Select', 'Dialog', 'Sheet', 'Popover', 'Tooltip',
      'Tabs', 'Card', 'Badges', 'Kbd', 'Sidebar',
    ]) {
      expect(screen.getByText(new RegExp(label, 'i'))).toBeInTheDocument();
    }
  });
});
