import React from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTableHeader from './DataTableHeader';
import { useDataTableContext } from './DataTableContext';
import { DataTableColumn, DataTableContextProps, DataTableVariant } from '../dataTableTypes';

vi.mock('./DataTableContext', () => ({ useDataTableContext: vi.fn() }));

// react-draggable's own drag mechanism is not under test here (per the task brief) - this mock
// only exposes the onStart/onStop callbacks DataTableHeader wires up, via two buttons a test can
// click, so we can prove its OWN visual response to a drag without simulating real mouse drag
// physics through the library.
type DraggableStub = {
  children: React.ReactNode;
  onStart?: (e: unknown, data: unknown) => void;
  onStop?: (e: unknown, data: { lastX: number }) => void;
};
vi.mock('react-draggable', () => ({
  default: ({ children, onStart, onStop }: DraggableStub) => (
    <div>
      <button type="button" data-testid="start-drag" onClick={() => onStart?.({}, {})}>start</button>
      <button type="button" data-testid="stop-drag" onClick={() => onStop?.({}, { lastX: 0 })}>stop</button>
      {children}
    </div>
  ),
}));

const column: DataTableColumn = {
  id: 'name',
  isSortable: true,
  label: 'Name',
  percentWidth: 50,
  order: 0,
};

const buildContext = (overrides: Partial<DataTableContextProps> = {}) => ({
  columns: [column],
  setColumns: vi.fn(),
  availableFilterKeys: [],
  onSort: vi.fn(),
  disableColumnMenu: true,
  variant: DataTableVariant.default,
  formatter: { t_i18n: (s: string) => s },
  tableWidthState: [500, vi.fn()],
  ...overrides,
} as unknown as DataTableContextProps);

const renderHeader = (props: Partial<React.ComponentProps<typeof DataTableHeader>> = {}) => render(
  <DataTableHeader
    column={column}
    setAnchorEl={vi.fn()}
    setActiveColumn={vi.fn()}
    isActive={false}
    sortBy={false}
    orderAsc={false}
    {...props}
  />,
);

describe('DataTableHeader', () => {
  beforeEach(() => {
    vi.mocked(useDataTableContext).mockReturnValue(buildContext());
  });

  it('renders the column label', () => {
    renderHeader();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('shows a sort indicator in the correct direction when the column is the active sort', () => {
    const { rerender } = renderHeader({ sortBy: true, orderAsc: true });
    expect(screen.getByTestId('ArrowDropUpIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('ArrowDropDownIcon')).not.toBeInTheDocument();

    rerender(
      <DataTableHeader
        column={column}
        setAnchorEl={vi.fn()}
        setActiveColumn={vi.fn()}
        isActive={false}
        sortBy
        orderAsc={false}
      />,
    );
    expect(screen.getByTestId('ArrowDropDownIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('ArrowDropUpIcon')).not.toBeInTheDocument();
  });

  it('does not show a sort indicator when the column is not the active sort', () => {
    renderHeader({ sortBy: false });
    expect(screen.queryByTestId('ArrowDropUpIcon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ArrowDropDownIcon')).not.toBeInTheDocument();
  });

  it('the resize handle is present and visually distinct (e.g. a data attribute or class) when dragging', async () => {
    const { container } = renderHeader();
    const handle = container.querySelector('.DataTableHeader-resizeHandle') as HTMLElement;
    expect(handle).toBeInTheDocument();
    expect(handle).not.toHaveAttribute('data-dragging');

    await userEvent.click(screen.getByTestId('start-drag'));
    expect(handle).toHaveAttribute('data-dragging', 'true');
    expect(handle.className).toContain('DataTableHeader-resizeHandle--dragging');

    await userEvent.click(screen.getByTestId('stop-drag'));
    expect(handle).not.toHaveAttribute('data-dragging');
    expect(handle.className).not.toContain('DataTableHeader-resizeHandle--dragging');
  });

  it('uses logical CSS properties (RTL-ready), never physical left/right, in its inline styles', () => {
    const { container } = renderHeader();
    const handle = container.querySelector('.DataTableHeader-resizeHandle') as HTMLElement;
    const sortButton = screen.getByText('Name').closest('button') as HTMLElement;

    // The resize handle sits on the trailing edge via `insetInlineEnd`, not a hardcoded `right`,
    // and its horizontal padding uses the inline-start/end pair, not left/right.
    const handleStyle = handle.getAttribute('style') ?? '';
    expect(handleStyle).toMatch(/inset-inline-end:\s*3px/);
    expect(handleStyle).toMatch(/padding-inline-start:\s*4px/);
    expect(handleStyle).toMatch(/padding-inline-end:\s*4px/);
    expect(handleStyle).not.toMatch(/(?<![-\w])right\s*:/);
    expect(handleStyle).not.toMatch(/padding-left\s*:/);
    expect(handleStyle).not.toMatch(/padding-right\s*:/);

    // The sort button's horizontal padding is also a logical inline-start/end pair.
    const buttonStyle = sortButton.getAttribute('style') ?? '';
    expect(buttonStyle).toMatch(/padding-inline-start:\s*8px/);
    expect(buttonStyle).toMatch(/padding-inline-end:\s*8px/);
    expect(buttonStyle).not.toMatch(/padding-left\s*:/);
    expect(buttonStyle).not.toMatch(/padding-right\s*:/);
  });

  it('any tooltip in this file uses ds/Tooltip, not a raw MUI Tooltip', async () => {
    // Static guard: the raw MUI import must be gone from the source, not just unused at runtime.
    const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'DataTableHeader.tsx');
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).not.toMatch(/@mui\/material\/Tooltip/);
    expect(source).toMatch(/from '\.\.\/\.\.\/ds'/);

    // Behavioral guard: ds/Tooltip (base-ui) shows its content on hover, same as the MUI tooltip did.
    // Label text appears twice once the popup opens (trigger span + popup content), so this waits
    // for the second occurrence specifically rather than resolving on the trigger alone.
    renderHeader();
    expect(screen.getAllByText('Name')).toHaveLength(1);
    await userEvent.hover(screen.getByText('Name'));
    await waitFor(() => expect(screen.getAllByText('Name')).toHaveLength(2));
  });

  it('row height stays in sync: this header introduces no vertical padding/border that ROW_HEIGHT would need to account for', () => {
    // ROW_HEIGHT (in DataTableBody.tsx) is documented as DataTableLine's 48px content + 1px
    // border - a sibling, out-of-scope file. DataTableHeader.tsx owns none of those dimensions
    // (its own row height of 42px is set by the parent flex row in DataTableHeaders.tsx). This
    // reads the real constant so a future, unrelated bump to it doesn't silently go stale here,
    // and asserts this file still contributes zero extra vertical space that a maintainer who
    // changed DataTableBody.tsx without updating this header would need to notice.
    const bodySourcePath = join(dirname(fileURLToPath(import.meta.url)), 'DataTableBody.tsx');
    const bodySource = readFileSync(bodySourcePath, 'utf-8');
    const match = bodySource.match(/const ROW_HEIGHT = (\d+);/);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(49);

    const { container } = renderHeader();
    const header = container.firstElementChild as HTMLElement;
    const style = getComputedStyle(header);
    expect(Number.parseFloat(style.borderBottomWidth || '0')).toBe(0);
    expect(Number.parseFloat(style.paddingTop || '0')).toBe(0);
    expect(Number.parseFloat(style.paddingBottom || '0')).toBe(0);
    expect(header.style.height).toBe('');
  });
});
