import React, { CSSProperties, FunctionComponent, useMemo, useRef, useState } from 'react';
import { PopoverProps } from '@mui/material/Popover';
import Box from '@mui/material/Box';
import { UNKNOWN_ENTITIES_LOCAL_STORAGE_KEY } from '@components/SearchBulkUnknownEntities';
import { DataTableColumn, DataTableHeadersProps } from '../dataTableTypes';
import DataTableHeader, { SELECT_COLUMN_SIZE } from './DataTableHeader';
import { useDataTableContext } from './DataTableContext';
import { Checkbox, Menu, MenuCheckboxItem, MenuContent, MenuItem } from '../../ds';

const DataTableHeaders: FunctionComponent<DataTableHeadersProps> = ({
  dataTableToolBarComponent,
}) => {
  const {
    columns,
    setColumns,
    useDataTableToggle: {
      selectAll,
      numberOfSelectedElements,
      handleToggleSelectAll,
    },
    formatter: { t_i18n },
    availableFilterKeys,
    onAddFilter,
    onSort,
    disableToolBar,
    removeSelectAll,
    startsWithAction,
    startsWithIcon,
    endsWithAction,
    actionsColumnWidth,
    startColumnWidth,
    visibleWidth,
    useDataTablePaginationLocalStorage: {
      viewStorage: { sortBy, orderAsc },
    },
    storageKey,
  } = useDataTableContext();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeColumn, setActiveColumn] = useState<DataTableColumn | undefined>();
  const [anchorEl, setAnchorEl] = useState<PopoverProps['anchorEl']>(null);
  const handleClose = () => {
    setAnchorEl(null);
    setActiveColumn(undefined);
  };

  // Flips `visible`, defaulting a never-set one to true first (`?? true`) so the very first
  // toggle has something concrete to flip. The previous `currentColumn.visible ?? true` (no
  // `!`) never actually toggled an already-boolean value - harmless only because its one call
  // site was gated behind a column id ('todo-navigate') no column ever has, so it never ran.
  // That gate is gone below (see `draggableColumns`): this list is now always reachable, so the
  // flip has to be real.
  const handleToggleVisibility = (columnId: string) => {
    const newColumns = [...columns];
    const currentColumn = newColumns.find(({ id }) => id === columnId);
    if (!currentColumn) {
      return;
    }
    currentColumn.visible = !(currentColumn.visible ?? true);
    setColumns(newColumns);
  };

  // Every real column (not the special 'select'/'navigate'/'icon' slots), regardless of which
  // column's own menu button was clicked - this is a "manage columns" list, not scoped to the
  // active column.
  const draggableColumns = useMemo(() => columns.filter(({ id }) => !['select', 'navigate', 'icon'].includes(id)), [columns]);

  const hasSelectedElements = numberOfSelectedElements > 0 || selectAll;
  const checkboxStyle: CSSProperties = {
    // Same selected-state token as the row's own selected background (ds/tokens.css, added by
    // the DataTableLine.tsx restyle) - kept visually consistent with it, not reinvented here.
    background: hasSelectedElements && !removeSelectAll
      ? 'var(--accent)'
      : 'transparent',
    minWidth: startColumnWidth,
    // The row is a 42px flex line whose default `align-items: stretch` made this slot full height while the 16px
    // library checkbox stayed at its top edge, so the box sat above the column labels it belongs to.
    display: 'flex',
    alignItems: 'center',
  };

  const showToolbar = (numberOfSelectedElements > 0 && !disableToolBar)
    || (storageKey === UNKNOWN_ENTITIES_LOCAL_STORAGE_KEY && selectAll); // case of DataTableWithoutFragment

  // The row is as wide as the columns, which can be wider than the table once a column is widened.
  // The toolbar replacing it is kept within the visible part of the table so that none of its actions is cut off.
  const toolbarStyle: CSSProperties = showToolbar
    ? { position: 'sticky', left: 0, maxWidth: visibleWidth || undefined }
    : {};

  return (
    <div ref={containerRef} style={{ display: 'flex', height: 42, ...toolbarStyle }}>
      {(startsWithAction || startsWithIcon) && (
        <div data-testid="dataTableCheckAll" style={checkboxStyle}>
          {(startsWithAction && !removeSelectAll) && (
            <Checkbox
              aria-label={t_i18n('Select all')}
              checked={selectAll}
              // None selected -> unchecked; some (but not selectAll) -> indeterminate;
              // selectAll -> checked. Same selection signals (`selectAll`/`numberOfSelectedElements`)
              // already read above for `hasSelectedElements`, now also rendered as a tri-state.
              indeterminate={!selectAll && numberOfSelectedElements > 0}
              // `ds/tokens.css`'s Tailwind utilities (e.g. a literal `mx-2`) only compile for
              // files under `src/components/ds/` (see `ds/tokens.css:17-18`'s `@source "./"`),
              // so a Tailwind class written here would carry no CSS - same 8px gap as
              // DataTableLine.tsx's row checkbox, via logical margin properties instead.
              style={{ marginInlineStart: 8, marginInlineEnd: 8 }}
              onCheckedChange={() => handleToggleSelectAll?.()}
              disabled={!handleToggleSelectAll}
            />
          )}
          {startsWithIcon && (
            <Box sx={{
              marginRight: 1,
              flex: '0 0 auto',
              paddingLeft: 0,
            }}
            />
          ) }
        </div>
      )}

      {showToolbar ? dataTableToolBarComponent : (
        <>
          {anchorEl && (
            // `anchorEl` is only ever a clicked column-menu button's DOM node (set by
            // DataTableHeader.tsx's `setAnchorEl(e.currentTarget)`) or `null` - narrower than
            // its declared `PopoverProps['anchorEl']` type (which also allows a function or a
            // raw position), kept only so this state stays assignable to that prop.
            <Menu
              open
              onOpenChange={(open) => {
                if (!open) handleClose();
              }}
            >
              <MenuContent anchor={anchorEl as Element | null}>
                {draggableColumns.map((c) => (
                  <MenuCheckboxItem
                    key={c.id}
                    checked={c.visible}
                    onCheckedChange={() => handleToggleVisibility(c.id)}
                  >
                    {t_i18n(c.label)}
                  </MenuCheckboxItem>
                ))}
                {/*
                  `ds/MenuItem` closes the menu on click by default (`closeOnClick`, true
                  unless overridden - see ds/Menu.tsx); the old MUI `MenuItem` never closed on
                  its own, and these two never called `handleClose()` themselves, so picking a
                  sort direction left the menu open. `closeOnClick={false}` keeps that exact
                  behavior rather than silently changing it via the primitive swap.
                */}
                {activeColumn?.isSortable && (<MenuItem closeOnClick={false} onClick={() => onSort(activeColumn.id, true)}>{t_i18n('Sort Asc')}</MenuItem>)}
                {activeColumn?.isSortable && (<MenuItem closeOnClick={false} onClick={() => onSort(activeColumn.id, false)}>{t_i18n('Sort Desc')}</MenuItem>)}
                {(activeColumn && availableFilterKeys?.includes(activeColumn.id)) && (
                  <MenuItem onClick={() => onAddFilter(activeColumn.id)}>
                    {t_i18n('Add filtering')}
                  </MenuItem>
                )}
              </MenuContent>
            </Menu>
          )}

          {columns
            .filter(({ id, visible }) => !['select', 'navigate', 'icon'].includes(id) && visible)
            .map((column) => (
              <DataTableHeader
                key={column.id}
                column={column}
                setAnchorEl={setAnchorEl}
                isActive={activeColumn?.id === column.id}
                setActiveColumn={setActiveColumn}
                containerRef={containerRef}
                sortBy={sortBy === column.id}
                orderAsc={!!orderAsc}
              />
            ))}

          {(endsWithAction) && <div style={{ width: actionsColumnWidth ?? SELECT_COLUMN_SIZE, flex: '0 0 auto' }} />}
        </>
      )}
    </div>
  );
};

export default DataTableHeaders;
