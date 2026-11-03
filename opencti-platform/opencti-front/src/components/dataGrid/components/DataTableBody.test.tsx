import React from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import DataTableBody from './DataTableBody';
import { useDataTableContext } from './DataTableContext';
import { useDataTable } from '../dataTableHooks';
import { DataTableContextProps, DataTableVariant, UseDataTable } from '../dataTableTypes';

vi.mock('./DataTableContext', () => ({ useDataTableContext: vi.fn() }));
vi.mock('../dataTableHooks', () => ({ useDataTable: vi.fn() }));
vi.mock('./DataTableHeaders', () => ({ default: () => null }));
vi.mock('./DataTableHeader', () => ({ ICON_COLUMN_SIZE: 56, SELECT_COLUMN_SIZE: 42 }));
vi.mock('./DataTableLine', () => ({
  default: ({ row }: { row: { id: string } }) => <div>{row.id}</div>,
  DataTableLinesDummy: () => <div data-testid="loading-rows" />,
}));
vi.mock('../../i18n', () => ({ useFormatter: () => ({ t_i18n: (message: string) => message }) }));
vi.mock('../../../utils/hooks/useAuth', () => ({ default: vi.fn() }));

const rows = [{ id: 'first-page-row' }];
const loadedRows = [...rows, { id: 'second-page-row' }];
const loadMore = vi.fn();
const theme = createTheme();

const tableBody = (pageStart = 1, emptyStateMessage?: string) => (
  <MemoryRouter>
    <ThemeProvider theme={theme}>
      <DataTableBody
        pageStart={pageStart}
        pageSize={1}
        hasFilterComponent={false}
        hideHeaders={true}
        emptyStateMessage={emptyStateMessage}
      />
    </ThemeProvider>
  </MemoryRouter>
);

const renderBody = (pageStart = 1, emptyStateMessage?: string) => render(tableBody(pageStart, emptyStateMessage));

const context = (overrides: Partial<DataTableContextProps> = {}) => ({
  variant: DataTableVariant.default,
  resolvePath: (data: { id: string }[]) => data,
  tableWidthState: [500, vi.fn()],
  columns: [],
  dataQueryArgs: {},
  useDataTableToggle: { selectedElements: {}, onToggleEntity: vi.fn() },
  useDataTablePaginationLocalStorage: { viewStorage: { searchTerm: 'indicator' } },
  ...overrides,
} as unknown as DataTableContextProps);

const query = (overrides: Partial<UseDataTable> = {}) => ({
  data: rows,
  isLoading: true,
  hasMore: () => true,
  isLoadingMore: () => true,
  loadMore,
  ...overrides,
});

describe('DataTableBody empty states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDataTableContext).mockReturnValue(context());
    vi.mocked(useDataTable).mockReturnValue(query());
  });

  it('shows loading rows instead of search results while the next page is pending', () => {
    renderBody();
    expect(loadMore).toHaveBeenCalledWith(1);
    expect(screen.getByTestId('loading-rows')).toBeInTheDocument();
    expect(screen.queryByText(/No results/)).not.toBeInTheDocument();
  });

  it('does not display a custom empty message while the next page is pending', () => {
    renderBody(1, 'No indicators available');
    expect(screen.getByTestId('loading-rows')).toBeInTheDocument();
    expect(screen.queryByText('No indicators available')).not.toBeInTheDocument();
  });

  it('does not display the filtered empty state while loading', () => {
    const pagination = context().useDataTablePaginationLocalStorage;
    vi.mocked(useDataTableContext).mockReturnValue(context({
      useDataTablePaginationLocalStorage: {
        ...pagination,
        viewStorage: {
          ...pagination.viewStorage,
          searchTerm: undefined,
          filters: { mode: 'and', filters: [{ key: 'entity_type', values: ['Indicator'] }], filterGroups: [] },
        },
      },
    }));
    renderBody();
    expect(screen.getByTestId('loading-rows')).toBeInTheDocument();
    expect(screen.queryByText('No results')).not.toBeInTheDocument();
  });

  it('shows the second page when the pending request completes', () => {
    const { rerender } = renderBody();
    vi.mocked(useDataTable).mockReturnValue(query({ data: loadedRows, isLoading: false, hasMore: () => false }));
    rerender(tableBody());
    expect(screen.getByText('second-page-row')).toBeInTheDocument();
    expect(screen.queryByText('first-page-row')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-rows')).not.toBeInTheDocument();
    expect(screen.queryByText(/No results/)).not.toBeInTheDocument();
  });

  it('still displays an empty search result when the request has settled', () => {
    vi.mocked(useDataTable).mockReturnValue(query({ data: [], isLoading: false, hasMore: () => false }));
    renderBody(0);
    expect(screen.getByText('No results for "indicator"')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-rows')).not.toBeInTheDocument();
  });

  it('still displays a settled custom empty message', () => {
    vi.mocked(useDataTable).mockReturnValue(query({ data: [], isLoading: false, hasMore: () => false }));
    renderBody(0, 'No indicators available');
    expect(screen.getByText('No indicators available')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-rows')).not.toBeInTheDocument();
  });

  it('preserves empty messages for local data without a Relay query', () => {
    vi.mocked(useDataTableContext).mockReturnValue(context({ data: [] }));
    renderBody(0, 'No local indicators');
    expect(screen.getByText('No local indicators')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-rows')).not.toBeInTheDocument();
    expect(useDataTable).not.toHaveBeenCalled();
  });

  it('shows a cached page immediately without loading rows', () => {
    vi.mocked(useDataTable).mockReturnValue(query({ data: loadedRows, isLoading: false }));
    renderBody(0);
    expect(screen.getByText('first-page-row')).toBeInTheDocument();
    expect(screen.queryByText('second-page-row')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-rows')).not.toBeInTheDocument();
    expect(screen.queryByText(/No results/)).not.toBeInTheDocument();
  });

  it('preserves loaded rows as infinite-scroll pagination loads more data', () => {
    const rootRef = document.createElement('div');
    Object.defineProperty(rootRef, 'offsetHeight', { value: 200 });
    vi.mocked(useDataTableContext).mockReturnValue(context({ rootRef, enableInfiniteScroll: true }));
    vi.mocked(useDataTable).mockReturnValue(query({ data: [] }));
    const { rerender } = renderBody(0);
    expect(screen.getByTestId('loading-rows')).toBeInTheDocument();
    expect(screen.queryByText(/No results/)).not.toBeInTheDocument();

    vi.mocked(useDataTable).mockReturnValue(query());
    rerender(tableBody(0));
    expect(screen.getByText('first-page-row')).toBeInTheDocument();
    expect(screen.getByTestId('loading-rows')).toBeInTheDocument();

    vi.mocked(useDataTable).mockReturnValue(query({ data: loadedRows, isLoading: false, hasMore: () => false }));
    rerender(tableBody(0));
    expect(screen.getByText('first-page-row')).toBeInTheDocument();
    expect(screen.getByText('second-page-row')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-rows')).not.toBeInTheDocument();
    expect(screen.queryByText(/No results/)).not.toBeInTheDocument();
  });

  it('stops loading when Relay clears its loading flag even if more rows remain available', () => {
    const { rerender } = renderBody();
    vi.mocked(useDataTable).mockReturnValue(query({ isLoading: false }));
    rerender(tableBody());
    expect(screen.queryByTestId('loading-rows')).not.toBeInTheDocument();
    expect(screen.getByText('No results for "indicator"')).toBeInTheDocument();
  });
});

describe('DataTableBody row height (end-to-end)', () => {
  // This is the capstone check for the whole ds/ restyle plan: it renders the REAL, composed
  // DataTableLine (not the stub mocked at the top of this file) inside DataTableBody's own
  // windowing, and measures it exactly the way DataTableLine.test.tsx's own local ROW_HEIGHT
  // test does, to prove no drift accumulated across every restyle task (4-9).
  afterEach(() => {
    // Restore the file-level stub so every other test in this file keeps using it.
    vi.doMock('./DataTableLine', () => ({
      default: ({ row }: { row: { id: string } }) => <div>{row.id}</div>,
      DataTableLinesDummy: () => <div data-testid="loading-rows" />,
    }));
  });

  it('ROW_HEIGHT in DataTableBody.tsx equals the actual rendered height of the real, composed DataTableLine row', async () => {
    vi.doUnmock('./DataTableLine');
    vi.resetModules();

    const { default: RealDataTableBody } = await import('./DataTableBody');
    const { useDataTableContext: realUseDataTableContext } = await import('./DataTableContext');
    const { DataTableVariant: RealVariant } = await import('../dataTableTypes');

    const row = { id: 'row-1' };
    const data = { id: 'row-1', name: 'Entity one' };
    const column = {
      id: 'name',
      label: 'Name',
      percentWidth: 100,
      order: 0,
      visible: true,
      render: (d: { name: string }) => <span>{d.name}</span>,
    };

    vi.mocked(realUseDataTableContext).mockReturnValue({
      columns: [column],
      useLineData: () => data,
      useDataCellHelpers: () => undefined,
      getComputeLink: () => undefined,
      actions: undefined,
      icon: undefined,
      disableNavigation: true,
      onLineClick: undefined,
      selectOnLineClick: false,
      variant: RealVariant.default,
      startsWithAction: false,
      startsWithIcon: false,
      startColumnWidth: 42,
      endsWithAction: false,
      endsWithNavigate: false,
      actionsColumnWidth: 42,
      tableWidthState: [500, vi.fn()],
      useDataTableToggle: {
        selectAll: false,
        deSelectedElements: {},
        selectedElements: {},
        onToggleEntity: vi.fn(),
      },
      useDataTablePaginationLocalStorage: {
        viewStorage: { redirectionMode: undefined },
      },
      formatter: { t_i18n: (s: string) => s },
      resolvePath: () => [row],
      dataQueryArgs: {},
      data: [row],
      enableInfiniteScroll: false,
    } as unknown as DataTableContextProps);

    const bodySourcePath = join(dirname(fileURLToPath(import.meta.url)), 'DataTableBody.tsx');
    const bodySource = readFileSync(bodySourcePath, 'utf-8');
    const match = bodySource.match(/const ROW_HEIGHT = (\d+);/);
    expect(match).not.toBeNull();
    const rowHeight = Number(match?.[1]);

    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <RealDataTableBody
            pageStart={0}
            pageSize={10}
            hasFilterComponent={false}
            hideHeaders
          />
        </ThemeProvider>
      </MemoryRouter>,
    );

    const anchor = screen.getByTestId('Entity one');
    const cell = anchor.querySelector('[role="gridcell"]') as HTMLElement;
    const cellHeight = Number.parseFloat(getComputedStyle(cell).height);
    const borderWidth = Number.parseFloat(getComputedStyle(anchor).borderBottomWidth);

    expect(cellHeight + borderWidth).toBe(rowHeight);
  });
});
