import React, { useEffect, useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  describe('column-visibility menu', () => {
    it('opens and lists every column with its current visibility as a checkbox item', async () => {
      renderHeaders();
      await openColumnMenu();

      const nameItem = await screen.findByRole('menuitemcheckbox', { name: 'Name' });
      const createdItem = screen.getByRole('menuitemcheckbox', { name: 'Created' });
      expect(nameItem).toHaveAttribute('aria-checked', 'true');
      expect(createdItem).toHaveAttribute('aria-checked', 'false');
    });

    it("toggling a column's visibility off and back on round-trips correctly through localStorage persistence", async () => {
      const STORAGE_KEY = 'headers-visibility-test';

      // Mirrors (in miniature) how DataTableComponent.tsx actually persists column
      // visibility: a `columns` state, flowed through context as `setColumns`, synced to
      // `window.localStorage` via an effect keyed off `columns`. This lets the assertions
      // below check the real localStorage-backed value, not merely the DOM checkbox state.
      function Harness() {
        const [columns, setColumnsState] = useState<DataTableColumn[]>([nameColumn, createdColumn]);

        useEffect(() => {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(Object.fromEntries(columns.map((c) => [c.id, { visible: c.visible }]))),
          );
        }, [columns]);

        vi.mocked(useDataTableContext).mockReturnValue(buildContext({ columns, setColumns: setColumnsState }));

        return <DataTableHeaders dataTableToolBarComponent={undefined} />;
      }

      render(<ThemeProvider theme={testTheme}><Harness /></ThemeProvider>);

      const readPersistedVisibility = (columnId: string) => {
        const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
        return persisted[columnId]?.visible;
      };

      expect(readPersistedVisibility('name')).toBe(true);

      await openColumnMenu();
      const nameItem = await screen.findByRole('menuitemcheckbox', { name: 'Name' });

      await userEvent.click(nameItem);
      expect(readPersistedVisibility('name')).toBe(false);
      expect(screen.getByRole('menuitemcheckbox', { name: 'Name' })).toHaveAttribute('aria-checked', 'false');

      await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Name' }));
      expect(readPersistedVisibility('name')).toBe(true);
      expect(screen.getByRole('menuitemcheckbox', { name: 'Name' })).toHaveAttribute('aria-checked', 'true');
    });

    it('is keyboard navigable: Tab to the column-menu button, Enter to open, Arrow keys between items, Space to toggle', async () => {
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
      const nameItem = await screen.findByRole('menuitemcheckbox', { name: 'Name' });

      // Unlike a menu opened through its own `MenuTrigger` (which auto-highlights the first
      // item), this menu has no `MenuTrigger` of its own - its real trigger button lives in a
      // sibling component, DataTableHeader.tsx - so nothing is highlighted yet on open; the
      // first arrow key both highlights and moves to the first item, "Name".
      await userEvent.keyboard('{ArrowDown}');
      expect(nameItem).toHaveAttribute('data-highlighted');

      await userEvent.keyboard('{ArrowDown}'); // moves the highlight onto "Sort Asc"
      expect(nameItem).not.toHaveAttribute('data-highlighted');
      await userEvent.keyboard('{ArrowUp}'); // moves it back onto "Name"
      expect(nameItem).toHaveAttribute('data-highlighted');

      // This test's context mock is static (unlike the dedicated persistence test above), so
      // toggling won't re-render the item unchecked; what matters here is that Space activates
      // the highlighted checkbox item and reaches the real toggle logic with the right result.
      expect(nameItem).toHaveAttribute('aria-checked', 'true');
      await userEvent.keyboard(' ');
      expect(setColumns).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 'name', visible: false }),
      ]));
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
