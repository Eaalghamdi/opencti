import React from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToggleButton from '@mui/material/ToggleButton';
import DataTableFilters from './DataTableFilters';
import { useDataTableContext } from './components/DataTableContext';
import { DataTableContextProps, DataTableVariant } from './dataTableTypes';

vi.mock('./components/DataTableContext', () => ({ useDataTableContext: vi.fn() }));
vi.mock('../i18n', () => ({ useFormatter: () => ({ t_i18n: (message: string) => message }) }));

// Heavy, unrelated subsystems this file only reaches through its own imports (filters UI,
// export drawers, access control) - stubbed so the test exercises DataTableFilters' own
// logic, not theirs.
vi.mock('@components/common/lists/Filters', () => ({ default: () => null }));
vi.mock('../FilterIconButton', () => ({ default: () => null }));
vi.mock('@components/common/stix_core_objects/StixCoreObjectsExports', () => ({ default: () => null }));
vi.mock('@components/common/stix_core_relationships/StixCoreRelationshipsExports', () => ({ default: () => null }));
vi.mock('@components/common/stix_domain_objects/StixDomainObjectsExports', () => ({ default: () => null }));
vi.mock('@components/observations/stix_cyber_observables/StixCyberObservablesExports', () => ({ default: () => null }));
vi.mock('../../utils/Security', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../utils/filters/filtersUtils', () => ({
  isFilterGroupNotEmpty: () => false,
  canonicalizeFilterGroupForBackend: (group: unknown) => group,
}));
vi.mock('../../utils/hooks/useGranted', () => ({ KNOWLEDGE_KNGETEXPORT: 'KNOWLEDGE_KNGETEXPORT' }));
vi.mock('../../utils/utils', () => ({ export_max_size: 50000 }));

const handleChangeView = vi.fn();
const handleToggleExports = vi.fn();

const buildContext = (overrides: Partial<DataTableContextProps> = {}) => ({
  storageKey: 'test-storage-key',
  redirectionModeEnabled: false,
  // `inline` (not `default`) keeps DataTablePagination out of the tree: it needs its own
  // DataTableContext fields (columns, setColumns, resetColumns...) this file's tests don't set.
  variant: DataTableVariant.inline,
  createButton: undefined,
  page: 1,
  setPage: vi.fn(),
  useDataTablePaginationLocalStorage: {
    helpers: {
      handleChangeView,
      handleToggleExports,
    },
    viewStorage: {
      numberOfElements: { original: 0, number: 0, symbol: '' },
      openExports: false,
    },
  },
  ...overrides,
} as unknown as DataTableContextProps);

const renderFilters = (props: Partial<React.ComponentProps<typeof DataTableFilters>> = {}) => render(
  <DataTableFilters paginationOptions={{}} {...props} />,
);

describe('DataTableFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDataTableContext).mockReturnValue(buildContext());
  });

  it('the display-mode toggle reflects the current mode and calls its handler when switched', async () => {
    // These two `ToggleButton`s stand in for what real call sites (Malwares.tsx, Campaigns.tsx,
    // ...) pass as `additionalHeaderToggleButtons`: plain MUI `ToggleButton`s with no `onClick`
    // of their own, relying on the surrounding `ToggleButtonGroup`'s context for `selected` state
    // and for routing clicks to `handleChangeView`.
    renderFilters({
      currentView: 'cards',
      additionalHeaderToggleButtons: [
        <ToggleButton key="cards" value="cards" aria-label="cards">Cards</ToggleButton>,
        <ToggleButton key="lines" value="lines" aria-label="lines">Lines</ToggleButton>,
      ],
    });

    const cardsButton = screen.getByRole('button', { name: 'cards' });
    const linesButton = screen.getByRole('button', { name: 'lines' });
    expect(cardsButton).toHaveAttribute('aria-pressed', 'true');
    expect(linesButton).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(linesButton);
    expect(handleChangeView).toHaveBeenCalledWith('lines');
  });

  it('the export button renders and calls its handler when activated', async () => {
    renderFilters({ exportContext: { entity_type: 'Malware' } });

    const exportButton = screen.getByRole('button', { name: 'Open export panel' });
    expect(exportButton).toBeInTheDocument();

    await userEvent.click(exportButton);
    expect(handleToggleExports).toHaveBeenCalledOnce();
  });

  it('does not render the export button when export is disabled', () => {
    renderFilters({ exportContext: undefined });
    expect(screen.queryByRole('button', { name: 'Open export panel' })).not.toBeInTheDocument();
  });

  it('does not render the toggle group when there are no additional toggle buttons', () => {
    renderFilters({});
    expect(screen.queryAllByRole('group')).toHaveLength(0);
  });

  it('any tooltip in DataTableFilters.tsx uses ds/Tooltip, not a raw MUI Tooltip', () => {
    // Static guard: the raw MUI import must be gone from the source, not just unused at runtime.
    const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'DataTableFilters.tsx');
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).not.toMatch(/@mui\/material\/Tooltip/);
    expect(source).toMatch(/from '\.\.\/ds'/);

    // Behavioral guard: ds/Tooltip (base-ui) shows its content on hover, same as the MUI
    // tooltip did, and the content is not rendered until then.
    renderFilters({ exportContext: { entity_type: 'Malware' } });
    expect(screen.queryByText('Open export panel')).not.toBeInTheDocument();
  });

  it('uses logical CSS properties (RTL-ready), never physical left/right, in its inline styles', () => {
    const { container } = renderFilters({
      exportContext: { entity_type: 'Malware' },
      additionalHeaderToggleButtons: [
        <ToggleButton key="cards" value="cards" aria-label="cards">Cards</ToggleButton>,
      ],
    });
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
