import React, { FunctionComponent, MouseEvent, RefObject, useRef, useState } from 'react';
import { ArrowDropDown, ArrowDropUp, MoreVert } from '@mui/icons-material';
import IconButton from '@common/button/IconButton';
import SimpleDraggable from 'react-draggable';
import { cn, Tooltip } from '../../ds';
import { DataTableHeaderProps, DataTableVariant } from '../dataTableTypes';
import { useDataTableContext } from './DataTableContext';

export const SELECT_COLUMN_SIZE = 42;
export const ICON_COLUMN_SIZE = 56;

// Marks the column menu button whichever way @common/button renders it: design-system button or MUI fallback.
const COLUMN_MENU_BUTTON_CLASS = 'DataTableHeader-columnMenu';
// Marks the resize handle; `--dragging` is appended only while react-draggable reports an active drag.
const RESIZE_HANDLE_CLASS = 'DataTableHeader-resizeHandle';
const RESIZE_HANDLE_DRAGGING_CLASS = `${RESIZE_HANDLE_CLASS}--dragging`;

/*
 * This file previously drove HeaderContainer/Label/Draggable's hover and drag colors through MUI
 * `styled()` nested selectors (`&:hover .react-draggable`, `.react-draggable-dragging`, etc).
 * `ds/tokens.css` only generates Tailwind utilities for files under `src/components/ds/`
 * (see `ds/tokens.test.ts`'s "limits Tailwind content scanning to this directory" assertion), so
 * an arbitrary-value Tailwind class written here would carry no CSS at all. Instead, the same
 * reveal-on-hover/reveal-on-drag behavior is tracked in plain React state below, and the colors
 * themselves are read from `ds/tokens.css`'s CSS custom properties via `var(...)`, which resolve
 * anywhere regardless of Tailwind's scan scope.
 */
const DataTableHeader: FunctionComponent<DataTableHeaderProps> = ({
  column,
  setAnchorEl,
  isActive,
  setActiveColumn,
  containerRef,
  sortBy,
  orderAsc,
}) => {
  const draggableRef = useRef<HTMLDivElement>(null);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const {
    columns,
    setColumns,
    availableFilterKeys,
    onSort,
    disableColumnMenu,
    variant,
    formatter: { t_i18n },
    tableWidthState: [tableWidth],
  } = useDataTableContext();

  // To avoid spamming sorting (and calling API)
  const throttleSortColumn = (e: MouseEvent) => {
    const el = e.target as HTMLDivElement;
    el.style.setProperty('pointer-events', 'none');
    setTimeout(() => el.style.setProperty('pointer-events', 'auto'), 800);
    if (column.isSortable) onSort(column.id, !orderAsc);
  };

  const openColumnMenu = (e: MouseEvent) => {
    setActiveColumn(column);
    setAnchorEl(e.currentTarget);
  };

  const hasColumnMenu = !disableColumnMenu && (column.isSortable || (availableFilterKeys ?? []).includes(column.id));
  const cellWidth = Math.round(tableWidth * (column.percentWidth / 100));
  // Same reveal-on-hover affordance the previous nested `&:hover` selectors drove: the resize
  // handle and the column-menu button stay hidden until the header is hovered (the menu button
  // also stays visible while its own menu is the active one, same as before).
  const showColumnMenuButton = isActive || isHeaderHovered;
  const showResizeHandle = isHeaderHovered || isDragging;

  return (
    <div
      key={column.id}
      style={{
        width: cellWidth,
        flex: '0 0 auto',
        position: 'relative',
        display: 'flex',
        fontWeight: 'bold',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
      onMouseEnter={() => setIsHeaderHovered(true)}
      onMouseLeave={() => setIsHeaderHovered(false)}
    >
      <div style={{ overflow: 'hidden', flex: 1 }} role="columnheader" aria-sort={sortBy ? (orderAsc ? 'ascending' : 'descending') : 'none'}>
        <button
          type="button"
          onClick={throttleSortColumn}
          disabled={!column.isSortable}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--foreground)',
            fontWeight: 700,
            paddingLeft: 8,
            paddingRight: 8,
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            fontSize: '12px',
            width: '100%',
            cursor: column.isSortable ? 'pointer' : 'unset',
          }}
        >
          <Tooltip trigger={<span>{t_i18n(column.label)}</span>} content={t_i18n(column.label)} />
          {sortBy && column.isSortable && (orderAsc ? <ArrowDropUp /> : <ArrowDropDown />)}
        </button>
      </div>
      {hasColumnMenu && (
        <IconButton
          disableRipple
          aria-label={t_i18n('View more')}
          className={COLUMN_MENU_BUTTON_CLASS}
          onClick={openColumnMenu}
          style={{
            visibility: showColumnMenuButton ? 'visible' : 'hidden',
          }}
          sx={{
            marginRight: 1,
            opacity: 0.5,
            width: 24,
            '&:hover': {
              background: 'transparent',
            },
          }}
        >
          <MoreVert />
        </IconButton>
      )}

      {variant !== DataTableVariant.inline && variant !== DataTableVariant.widget && (
        <SimpleDraggable
          nodeRef={draggableRef as unknown as RefObject<HTMLDivElement>}
          position={{ x: 3, y: -3 }}
          axis="x"
          onStart={() => setIsDragging(true)}
          onStop={(_, { lastX }) => {
            setIsDragging(false);
            if (containerRef?.current) {
              // Compute new width in percentage of the column.
              const containerWidth = containerRef.current.clientWidth;
              const columnWidth = (column.percentWidth * containerWidth) / 100;
              const newColumnWidth = columnWidth + lastX;
              const newPercentage = (newColumnWidth / containerWidth) * 100;
              if (newPercentage < 0) return;

              // Override the new percent width.
              let newColumns = columns.map((c) => {
                if (c.id === column.id) return { ...c, percentWidth: newPercentage };
                return c;
              });

              // Total width should be at least 100% so extend neighbor column if necessary.
              const sumPercentage = newColumns.reduce((acc, col) => acc + (col.percentWidth ?? 0), 0);
              if (sumPercentage < 100) {
                const maxOrder = Math.max(...newColumns.flatMap((c) => c.order ?? []));
                const neighborOrder = column.order < maxOrder ? column.order + 1 : column.order - 1;
                newColumns = newColumns.map((c) => {
                  if (c.order === neighborOrder) {
                    const percentWidth = c.percentWidth + (100 - sumPercentage);
                    return { ...c, percentWidth };
                  }
                  return c;
                });
              }

              setColumns(newColumns);
            }
          }}
        >
          <div
            ref={draggableRef}
            className={cn(RESIZE_HANDLE_CLASS, isDragging && RESIZE_HANDLE_DRAGGING_CLASS)}
            data-dragging={isDragging ? 'true' : undefined}
            style={{
              position: 'absolute',
              top: '8px',
              right: 3,
              height: 32,
              width: 10,
              paddingLeft: 4,
              paddingRight: 4,
              backgroundClip: 'content-box',
              borderRadius: 2,
              cursor: 'col-resize',
              backgroundColor: showResizeHandle ? 'var(--primary)' : 'transparent',
            }}
          />
        </SimpleDraggable>
      )}
    </div>
  );
};

export default DataTableHeader;
