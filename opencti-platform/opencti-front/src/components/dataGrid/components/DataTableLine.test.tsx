import React from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import DataTableLine from './DataTableLine';
import { useDataTableContext } from './DataTableContext';
import { DataTableColumn, DataTableContextProps, DataTableVariant } from '../dataTableTypes';

vi.mock('./DataTableContext', () => ({ useDataTableContext: vi.fn() }));

const selectColumn: DataTableColumn = {
  id: 'select',
  percentWidth: 0,
  order: -1,
  visible: true,
};

const column: DataTableColumn = {
  id: 'name',
  label: 'Name',
  percentWidth: 100,
  order: 0,
  visible: true,
  render: (data: { name: string }) => <span>{data.name}</span>,
};

const row = { id: 'row-1' };
const data = { id: 'row-1', name: 'Entity one' };

const onToggleEntity = vi.fn();
const onToggleShiftEntity = vi.fn();

const buildContext = (overrides: Partial<DataTableContextProps> = {}) => ({
  columns: [selectColumn, column],
  useLineData: () => data,
  useDataCellHelpers: () => undefined,
  getComputeLink: () => undefined,
  actions: undefined,
  icon: undefined,
  disableNavigation: true,
  onLineClick: undefined,
  selectOnLineClick: false,
  variant: DataTableVariant.default,
  startsWithAction: true,
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
    onToggleEntity,
  },
  useDataTablePaginationLocalStorage: {
    viewStorage: { redirectionMode: undefined },
  },
  formatter: { t_i18n: (s: string) => s },
  ...overrides,
} as unknown as DataTableContextProps);

const renderLine = (
  theme = createTheme(),
) => render(
  <MemoryRouter>
    <ThemeProvider theme={theme}>
      <DataTableLine row={row} index={0} onToggleShiftEntity={onToggleShiftEntity} />
    </ThemeProvider>
  </MemoryRouter>,
);

const getRowAnchor = () => screen.getByTestId('Entity one');

describe('DataTableLine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDataTableContext).mockReturnValue(buildContext());
  });

  it('renders a selected visual state when the row is checked', () => {
    vi.mocked(useDataTableContext).mockReturnValue(buildContext({
      useDataTableToggle: {
        selectAll: false,
        deSelectedElements: {},
        selectedElements: { 'row-1': data },
        onToggleEntity,
      },
    } as unknown as Partial<DataTableContextProps>));
    renderLine();
    const anchor = getRowAnchor();
    expect(anchor.getAttribute('style') ?? '').toMatch(/background-color:\s*var\(--accent\)/);
  });

  it('does not render the selected background when the row is not checked', () => {
    renderLine();
    const anchor = getRowAnchor();
    expect(anchor.getAttribute('style') ?? '').not.toMatch(/background-color:\s*var\(--accent\)/);
  });

  it('calls onToggleEntity when the row checkbox is toggled', async () => {
    renderLine();
    const checkbox = screen.getByRole('checkbox', { name: 'Select line' });
    await userEvent.click(checkbox);
    expect(onToggleEntity).toHaveBeenCalledTimes(1);
    expect(onToggleEntity).toHaveBeenCalledWith(data, expect.anything());
  });

  it("the row's hover state is visually distinct from its default state", () => {
    renderLine();
    const anchor = getRowAnchor();
    const row_ = anchor.parentElement as HTMLElement;

    expect(anchor.getAttribute('style') ?? '').not.toMatch(/background-color:\s*var\(--muted\)/);
    fireEvent.mouseEnter(row_);
    expect(anchor.getAttribute('style') ?? '').toMatch(/background-color:\s*var\(--muted\)/);
    fireEvent.mouseLeave(row_);
    expect(anchor.getAttribute('style') ?? '').not.toMatch(/background-color:\s*var\(--muted\)/);
  });

  it('row divider border renders correctly in both light and dark theme modes', () => {
    const { unmount } = renderLine(createTheme({ palette: { mode: 'light' } }));
    let style = getRowAnchor().getAttribute('style') ?? '';
    expect(style).toMatch(/border-bottom-width:\s*1px/);
    expect(style).toMatch(/border-bottom-style:\s*solid/);
    expect(style).toMatch(/border-bottom-color:\s*var\(--border\)/);
    unmount();

    renderLine(createTheme({ palette: { mode: 'dark' } }));
    style = getRowAnchor().getAttribute('style') ?? '';
    expect(style).toMatch(/border-bottom-width:\s*1px/);
    expect(style).toMatch(/border-bottom-style:\s*solid/);
    expect(style).toMatch(/border-bottom-color:\s*var\(--border\)/);
  });

  it('row actions render and call their handlers when activated', async () => {
    const actionOnClick = vi.fn();
    vi.mocked(useDataTableContext).mockReturnValue(buildContext({
      actions: () => <button type="button" onClick={actionOnClick}>Row action</button>,
      endsWithAction: true,
    }));
    renderLine();
    await userEvent.click(screen.getByRole('button', { name: 'Row action' }));
    expect(actionOnClick).toHaveBeenCalledTimes(1);
  });

  it('the "open link" row action navigates when a link is available', async () => {
    vi.mocked(useDataTableContext).mockReturnValue(buildContext({
      getComputeLink: () => '/dashboard/entity/row-1',
      endsWithAction: true,
      endsWithNavigate: true,
      disableNavigation: false,
    }));
    renderLine();
    const openLinkButton = screen.getByRole('button', { name: 'Open link' });
    expect(openLinkButton).toBeInTheDocument();
    // Activating it should not throw and should remain a plain, enabled button.
    await userEvent.click(openLinkButton);
    expect(openLinkButton).not.toBeDisabled();
  });

  it('uses logical CSS properties (RTL-ready), never physical left/right, in its inline styles', () => {
    vi.mocked(useDataTableContext).mockReturnValue(buildContext({
      useDataTableToggle: {
        selectAll: false,
        deSelectedElements: {},
        selectedElements: { 'row-1': data },
        onToggleEntity,
      },
    } as unknown as Partial<DataTableContextProps>));
    renderLine();

    const checkbox = screen.getByRole('checkbox', { name: 'Select line' });
    const checkboxStyle = checkbox.getAttribute('style') ?? '';
    expect(checkboxStyle).toMatch(/margin-inline-start:\s*8px/);
    expect(checkboxStyle).toMatch(/margin-inline-end:\s*8px/);
    expect(checkboxStyle).not.toMatch(/margin-left\s*:/);
    expect(checkboxStyle).not.toMatch(/margin-right\s*:/);

    const anchorStyle = getRowAnchor().getAttribute('style') ?? '';
    expect(anchorStyle).not.toMatch(/(?<![-\w])right\s*:/);
    expect(anchorStyle).not.toMatch(/padding-left\s*:/);
    expect(anchorStyle).not.toMatch(/padding-right\s*:/);
  });

  it('row height stays in sync: this row\'s own rendered height matches ROW_HEIGHT in DataTableBody.tsx', () => {
    const bodySourcePath = join(dirname(fileURLToPath(import.meta.url)), 'DataTableBody.tsx');
    const bodySource = readFileSync(bodySourcePath, 'utf-8');
    const match = bodySource.match(/const ROW_HEIGHT = (\d+);/);
    expect(match).not.toBeNull();
    const rowHeight = Number(match?.[1]);

    renderLine();
    const anchor = getRowAnchor();
    const cell = anchor.querySelector('[role="gridcell"]') as HTMLElement;
    const cellHeight = Number.parseFloat(getComputedStyle(cell).height);
    const borderWidth = Number.parseFloat(getComputedStyle(anchor).borderBottomWidth);

    expect(cellHeight + borderWidth).toBe(rowHeight);
  });
});
