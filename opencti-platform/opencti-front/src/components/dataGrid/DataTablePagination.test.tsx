import React from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTablePagination from './DataTablePagination';
import { useDataTableContext } from './components/DataTableContext';
import { DataTableColumn, DataTableContextProps } from './dataTableTypes';

vi.mock('./components/DataTableContext', () => ({ useDataTableContext: vi.fn() }));
vi.mock('../i18n', () => ({ useFormatter: () => ({ t_i18n: (message: string) => message }) }));

const nameColumn: DataTableColumn = {
  id: 'name',
  label: 'Name',
  percentWidth: 100,
  order: 0,
  visible: true,
};

const setColumns = vi.fn();
const resetColumns = vi.fn();
const handleAddProperty = vi.fn();
const setPage = vi.fn();

const buildContext = (overrides: Partial<DataTableContextProps> = {}) => ({
  columns: [nameColumn],
  setColumns,
  resetColumns,
  useDataTablePaginationLocalStorage: {
    viewStorage: {
      pageSize: '25',
      numberOfElements: { original: 100, number: 100, symbol: '' },
      redirectionMode: undefined,
    },
    helpers: { handleAddProperty },
  },
  ...overrides,
} as unknown as DataTableContextProps);

const renderPagination = (props: Partial<React.ComponentProps<typeof DataTablePagination>> = {}) => render(
  <DataTablePagination page={1} setPage={setPage} {...props} />,
);

describe('DataTablePagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDataTableContext).mockReturnValue(buildContext());
  });

  it('calls the previous-page handler when the previous control is activated', async () => {
    renderPagination({ page: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it('calls the next-page handler when the next control is activated', async () => {
    renderPagination({ page: 1 });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(setPage).toHaveBeenCalledWith(2);
  });

  it('disables the previous control on the first page and the next control on the last page', () => {
    // 100 elements, 25 per page, on page 1: firstItem=1 (previous disabled),
    // lastItem=25 !== 100 (next enabled).
    const firstPage = renderPagination({ page: 1 });
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
    firstPage.unmount();

    // On page 4 (items 76-100): lastItem===numberOfElements.original, so next is disabled,
    // and firstItem !== 1, so previous is enabled.
    renderPagination({ page: 4 });
    expect(screen.getByRole('button', { name: 'Previous' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('opens the items-per-page submenu, reflects the current page size as checked, and selecting a value calls the handler with the chosen count and closes the whole menu', async () => {
    // No columns -> no "Columns" submenu in between "Reset table" and "Rows per page", so one
    // ArrowDown after opening reaches the "Rows per page" submenu trigger directly.
    vi.mocked(useDataTableContext).mockReturnValue(buildContext({ columns: [] } as unknown as Partial<DataTableContextProps>));
    renderPagination();

    const trigger = screen.getByRole('button', { name: 'Table settings' });
    trigger.focus();
    await userEvent.keyboard('{Enter}'); // opens the root menu; "Reset table" (the first item) is highlighted
    await userEvent.keyboard('{ArrowDown}'); // moves the highlight onto the "Rows per page" submenu trigger
    await userEvent.keyboard('{Enter}'); // activates it, opening the nested submenu

    // The context mock's current pageSize ('25') is reflected as the checked option, mirroring
    // the same checked-item affordance the "Columns" submenu already has via MenuCheckboxItem.
    expect(await screen.findByRole('menuitemcheckbox', { name: '25' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemcheckbox', { name: '50' })).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: '50' }));

    expect(handleAddProperty).toHaveBeenCalledWith('pageSize', '50');
    // Unlike the "Columns" multi-select submenu (which stays open to toggle more items), picking
    // a rows-per-page value is single-select and closes the whole menu - matching the pre-restyle
    // NestedMenuButton's handleClickOption, which called handleClose(0) here (keepMenuOpen was
    // never set for this group).
    expect(screen.queryByRole('menuitemcheckbox', { name: '25' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Reset table' })).not.toBeInTheDocument();
  });

  it('opens the redirection-mode submenu and reflects the current mode as checked, and selecting a value calls the handler with the chosen mode and closes the whole menu', async () => {
    vi.mocked(useDataTableContext).mockReturnValue(buildContext({
      columns: [],
      useDataTablePaginationLocalStorage: {
        viewStorage: {
          pageSize: '25',
          numberOfElements: { original: 100, number: 100, symbol: '' },
          redirectionMode: 'knowledge',
        },
        helpers: { handleAddProperty },
      },
    } as unknown as Partial<DataTableContextProps>));
    renderPagination({ redirectionModeEnabled: true });

    const trigger = screen.getByRole('button', { name: 'Table settings' });
    trigger.focus();
    await userEvent.keyboard('{Enter}'); // opens the root menu; "Reset table" is highlighted
    await userEvent.keyboard('{ArrowDown}'); // "Rows per page" submenu trigger
    await userEvent.keyboard('{ArrowDown}'); // "Redirection mode" submenu trigger
    await userEvent.keyboard('{Enter}'); // opens the nested submenu

    expect(await screen.findByRole('menuitemcheckbox', { name: 'Redirecting to the Knowledge section' }))
      .toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemcheckbox', { name: 'Redirecting to the Overview section' }))
      .toHaveAttribute('aria-checked', 'false');

    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Redirecting to the Content section' }));

    expect(handleAddProperty).toHaveBeenCalledWith('redirectionMode', 'content');
    // Single-select, same as rows-per-page above: picking a redirection mode closes the whole
    // menu rather than staying open for more toggles.
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Redirecting to the Knowledge section' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Reset table' })).not.toBeInTheDocument();
  });

  it('displays the current number-of-elements/result-count text', () => {
    renderPagination({ page: 1 });
    const resultCount = screen.getByTestId('dataTablePaginationResultCount');
    expect(resultCount).toHaveTextContent('1 - 25');
    expect(resultCount).toHaveTextContent('/ 100');
  });

  it('any tooltip in this file uses ds/Tooltip, not a raw MUI Tooltip', () => {
    // Static guard: the raw MUI import must be gone from the source, not just unused at runtime.
    const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'DataTablePagination.tsx');
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).not.toMatch(/@mui\/material\/Tooltip/);
    expect(source).toMatch(/from '\.\.\/ds'/);

    // Behavioral guard: ds/Tooltip (base-ui) shows its content on hover, same as the MUI tooltip did.
    renderPagination({ page: 1 });
    expect(screen.queryByText('entitie(s)')).not.toBeInTheDocument();
  });

  it('uses logical CSS properties (RTL-ready), never physical left/right, in its inline styles', () => {
    const { container } = renderPagination({ page: 1 });
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
      expect(style).not.toMatch(/border-left\s*:/);
      expect(style).not.toMatch(/border-right\s*:/);
    });
  });
});
