import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTheme, ThemeOptions, ThemeProvider } from '@mui/material/styles';
import DataTableHeaders from './DataTableHeaders';
import { useDataTableContext } from './DataTableContext';
import { DataTableColumn, DataTableContextProps, DataTableVariant } from '../dataTableTypes';
import ThemeDark from '../../ThemeDark';

// DataTableHeader's column-menu button falls back to the app's own `common/button/Button`,
// which reads custom theme properties (e.g. `palette.border`) that a bare `createTheme()`
// does not provide - the same reason Workflow.test.tsx builds its test theme this way.
const testTheme = createTheme(ThemeDark() as ThemeOptions);

vi.mock('./DataTableContext', () => ({ useDataTableContext: vi.fn() }));

const nameColumn: DataTableColumn = {
  id: 'name',
  label: 'Name',
  percentWidth: 70,
  order: 0,
  visible: true,
  isSortable: true,
};

const createdColumn: DataTableColumn = {
  id: 'created',
  label: 'Created',
  percentWidth: 30,
  order: 1,
  visible: false,
};

const handleToggleSelectAll = vi.fn();
const onSort = vi.fn();
const onAddFilter = vi.fn();
const setColumns = vi.fn();

const buildContext = (overrides: Partial<DataTableContextProps> = {}) => ({
  columns: [nameColumn, createdColumn],
  setColumns,
  availableFilterKeys: [],
  onAddFilter,
  onSort,
  disableToolBar: false,
  disableColumnMenu: false,
  removeSelectAll: false,
  startsWithAction: true,
  startsWithIcon: false,
  startColumnWidth: 42,
  endsWithAction: false,
  actionsColumnWidth: 42,
  visibleWidth: 1000,
  variant: DataTableVariant.default,
  tableWidthState: [1000, vi.fn()],
  useDataTableToggle: {
    selectAll: false,
    numberOfSelectedElements: 0,
    handleToggleSelectAll,
  },
  useDataTablePaginationLocalStorage: {
    viewStorage: { sortBy: undefined, orderAsc: undefined },
  },
  formatter: { t_i18n: (s: string) => s },
  storageKey: 'test-storage-key',
  ...overrides,
} as unknown as DataTableContextProps);

const renderHeaders = () => render(
  <ThemeProvider theme={testTheme}>
    <DataTableHeaders dataTableToolBarComponent={undefined} />
  </ThemeProvider>,
);

// DataTableHeader.tsx (frozen, Task 4) keeps its column-menu ("kebab") button
// `visibility: hidden` - removed from the accessibility tree and the tab order - until the
// column header is hovered. A real user reaches it by hovering first; this mirrors that.
const hoverColumnHeader = () => {
  const header = screen.getByRole('columnheader').parentElement as HTMLElement;
  fireEvent.mouseEnter(header);
};

const openColumnMenu = async () => {
  hoverColumnHeader();
  const kebab = screen.getByRole('button', { name: 'View more' });
  await userEvent.click(kebab);
};

describe('DataTableHeaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.mocked(useDataTableContext).mockReturnValue(buildContext());
  });

  describe('select-all checkbox', () => {
    it('is unchecked when nothing is selected', () => {
      vi.mocked(useDataTableContext).mockReturnValue(buildContext({
        useDataTableToggle: { selectAll: false, numberOfSelectedElements: 0, handleToggleSelectAll },
      } as unknown as Partial<DataTableContextProps>));
      renderHeaders();
      const checkbox = screen.getByRole('checkbox', { name: 'Select all' });
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    it('is indeterminate when some, but not all, rows are selected', () => {
      vi.mocked(useDataTableContext).mockReturnValue(buildContext({
        useDataTableToggle: { selectAll: false, numberOfSelectedElements: 3, handleToggleSelectAll },
      } as unknown as Partial<DataTableContextProps>));
      renderHeaders();
      const checkbox = screen.getByRole('checkbox', { name: 'Select all' });
      expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
    });

    it('is checked when selectAll is true', () => {
      vi.mocked(useDataTableContext).mockReturnValue(buildContext({
        useDataTableToggle: { selectAll: true, numberOfSelectedElements: 10, handleToggleSelectAll },
      } as unknown as Partial<DataTableContextProps>));
      renderHeaders();
      const checkbox = screen.getByRole('checkbox', { name: 'Select all' });
      expect(checkbox).toHaveAttribute('aria-checked', 'true');
    });

    it('calls the select-all handler when toggled', async () => {
      renderHeaders();
      const checkbox = screen.getByRole('checkbox', { name: 'Select all' });
      await userEvent.click(checkbox);
      expect(handleToggleSelectAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('column menu', () => {
    it('shows only the sort items for a sortable column, with no column-visibility list', async () => {
      renderHeaders();
      await openColumnMenu();

      expect(await screen.findByRole('menuitem', { name: 'Sort Asc' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Sort Desc' })).toBeInTheDocument();
      // Not filterable in this context (`availableFilterKeys: []`).
      expect(screen.queryByRole('menuitem', { name: 'Add filtering' })).not.toBeInTheDocument();
      // The pre-restyle menu never rendered a per-column visibility list (its only source was
      // dead code gated behind a column id no column has); that lives in "Table settings".
      expect(screen.queryAllByRole('menuitemcheckbox')).toHaveLength(0);
      expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    });

    it('shows "Add filtering" for a filterable column, calls onAddFilter and closes the menu', async () => {
      vi.mocked(useDataTableContext).mockReturnValue(buildContext({
        availableFilterKeys: ['name'],
      } as unknown as Partial<DataTableContextProps>));
      renderHeaders();
      await openColumnMenu();

      const addFilter = await screen.findByRole('menuitem', { name: 'Add filtering' });
      expect(screen.getAllByRole('menuitem')).toHaveLength(3);
      await userEvent.click(addFilter);

      expect(onAddFilter).toHaveBeenCalledWith('name');
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });

    it('choosing a sort direction calls onSort and leaves the menu open, matching the pre-restyle MUI menu\'s behavior', async () => {
      renderHeaders();
      await openColumnMenu();

      const sortAsc = await screen.findByRole('menuitem', { name: 'Sort Asc' });
      await userEvent.click(sortAsc);

      expect(onSort).toHaveBeenCalledWith('name', true);
      // Deliberate: ds/MenuItem closes on click by default, but the old MUI-based menu never
      // closed itself on a Sort Asc/Desc click (neither item ever called the close handler),
      // so `closeOnClick={false}` is passed on both to preserve that exact behavior.
      expect(screen.getByRole('menuitem', { name: 'Sort Asc' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Sort Desc' })).toBeInTheDocument();
    });

    it('is keyboard navigable: Tab to the column-menu button, Enter to open, Arrow keys between items, Enter to activate', async () => {
      vi.mocked(useDataTableContext).mockReturnValue(buildContext({
        startsWithAction: false,
        columns: [nameColumn],
      } as unknown as Partial<DataTableContextProps>));
      renderHeaders();
      hoverColumnHeader(); // reveals the column-menu button, same as a real pointer-and-keyboard user would

      // Tab order with no select-all checkbox and a single sortable column: the column's
      // own sort-label button first, then its column-menu ("kebab") button.
      await userEvent.tab();
      await userEvent.tab();
      const kebab = screen.getByRole('button', { name: 'View more' });
      expect(kebab).toHaveFocus();

      await userEvent.keyboard('{Enter}');
      const sortAsc = await screen.findByRole('menuitem', { name: 'Sort Asc' });
      const sortDesc = screen.getByRole('menuitem', { name: 'Sort Desc' });

      // Unlike a menu opened through its own `MenuTrigger` (which auto-highlights the first
      // item), this menu has no `MenuTrigger` of its own - its real trigger button lives in a
      // sibling component, DataTableHeader.tsx - so nothing is highlighted yet on open; the
      // first arrow key both highlights and moves to the first item, "Sort Asc".
      await userEvent.keyboard('{ArrowDown}');
      expect(sortAsc).toHaveAttribute('data-highlighted');

      await userEvent.keyboard('{ArrowDown}'); // moves the highlight onto "Sort Desc"
      expect(sortDesc).toHaveAttribute('data-highlighted');
      expect(sortAsc).not.toHaveAttribute('data-highlighted');
      await userEvent.keyboard('{ArrowUp}'); // moves it back onto "Sort Asc"
      expect(sortAsc).toHaveAttribute('data-highlighted');

      await userEvent.keyboard('{Enter}');
      expect(onSort).toHaveBeenCalledWith('name', true);
    });
  });

  it('shows the toolbar instead of the headers once rows are selected', () => {
    vi.mocked(useDataTableContext).mockReturnValue(buildContext({
      useDataTableToggle: { selectAll: false, numberOfSelectedElements: 1, handleToggleSelectAll },
    } as unknown as Partial<DataTableContextProps>));
    render(<DataTableHeaders dataTableToolBarComponent={<div data-testid="toolbar">Toolbar</div>} />);
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('uses logical CSS properties (RTL-ready), never physical left/right, in its inline styles', () => {
    renderHeaders();
    const checkAllSlot = screen.getByTestId('dataTableCheckAll');
    expect(checkAllSlot.getAttribute('style') ?? '').not.toMatch(/(?<![-\w])left\s*:/);
    expect(checkAllSlot.getAttribute('style') ?? '').not.toMatch(/(?<![-\w])right\s*:/);

    const checkbox = screen.getByRole('checkbox', { name: 'Select all' });
    const checkboxStyle = checkbox.getAttribute('style') ?? '';
    expect(checkboxStyle).not.toMatch(/margin-left\s*:/);
    expect(checkboxStyle).not.toMatch(/margin-right\s*:/);
  });
});
