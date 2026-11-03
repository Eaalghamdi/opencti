import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import testRender from '../../../../../utils/tests/test-render';

const mockFetchQuery = vi.fn();
vi.mock('../../../../../relay/environment', () => ({
  fetchQuery: (...args: unknown[]) => mockFetchQuery(...args),
  MESSAGING$: { messages$: { subscribe: vi.fn() } },
}));

import CustomViewPreviewEntitySelector from './CustomViewPreviewEntitySelector';

const mockStixCoreObjectsData = {
  stixCoreObjects: {
    edges: [
      { node: { id: 'malware--1', entity_type: 'Malware', representative: { main: 'WannaCry' } } },
      { node: { id: 'report--1', entity_type: 'Report', representative: { main: 'Annual Threat Report' } } },
    ],
  },
};

describe('CustomViewPreviewEntitySelector', () => {
  beforeEach(() => {
    mockFetchQuery.mockReset();
    mockFetchQuery.mockReturnValue({ toPromise: () => Promise.resolve(mockStixCoreObjectsData) });
  });

  it('searches on focus and renders matching entities with their icon', async () => {
    const { user } = testRender(
      <CustomViewPreviewEntitySelector type="Stix-Core-Object" onPreviewEntityChange={vi.fn()} />,
    );

    // Focusing the field (without typing anything) must trigger a search, exactly
    // like the previous MUI Autocomplete's onFocus handler.
    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByText('WannaCry')).toBeInTheDocument();
    expect(screen.getByText('Annual Threat Report')).toBeInTheDocument();
    // Each option row carries ItemIcon's own icon, keyed by entity_type - checked
    // via ItemIcon's MUI-generated data-testid (its <svg> is aria-hidden by MUI's
    // own SvgIcon default, in both the old and new implementation alike, so a
    // role-based query would not distinguish them).
    const malwareOption = screen.getByRole('option', { name: /WannaCry/ });
    expect(within(malwareOption).getByTestId('BiohazardIcon')).toBeInTheDocument();
    const reportOption = screen.getByRole('option', { name: /Annual Threat Report/ });
    expect(within(reportOption).getByTestId('DescriptionOutlinedIcon')).toBeInTheDocument();

    expect(mockFetchQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'Stix-Core-Object', search: '' }),
    );
  });

  it('searches again as the user types, passing the input text to the query', async () => {
    const { user } = testRender(
      <CustomViewPreviewEntitySelector type="Stix-Core-Object" onPreviewEntityChange={vi.fn()} />,
    );

    await user.type(screen.getByRole('combobox'), 'wanna');

    expect(mockFetchQuery).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'Stix-Core-Object', search: 'wanna' }),
    );
  });

  it('calls onPreviewEntityChange with the selected entity id, and with null when cleared', async () => {
    const onPreviewEntityChange = vi.fn();
    const { user } = testRender(
      <CustomViewPreviewEntitySelector type="Stix-Core-Object" onPreviewEntityChange={onPreviewEntityChange} />,
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('WannaCry'));
    expect(onPreviewEntityChange).toHaveBeenCalledWith('malware--1');

    await user.click(await screen.findByRole('button', { name: /clear/i }));
    expect(onPreviewEntityChange).toHaveBeenCalledWith(null);
  });

  it('applies the in-preview tint styling once a value is selected, and removes it when cleared', async () => {
    const { container, user } = testRender(
      <CustomViewPreviewEntitySelector type="Stix-Core-Object" onPreviewEntityChange={vi.fn()} />,
    );

    // Before any selection, nothing marks the field as "in preview".
    expect(container.querySelector('[data-selected="true"]')).toBeNull();

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('WannaCry'));

    const field = container.querySelector('[data-selected="true"]');
    expect(field).not.toBeNull();
    // A real, perceptible marker - not just the data attribute's presence.
    expect((field as HTMLElement).style.borderColor).not.toBe('');

    await user.click(await screen.findByRole('button', { name: /clear/i }));
    expect(container.querySelector('[data-selected="true"]')).toBeNull();
  });
});
