import React, { CSSProperties, useMemo, useState } from 'react';
import { Skeleton } from '@mui/material';
import { KeyboardArrowRightOutlined } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router';
import type { DataTableCellProps, DataTableLineProps } from '../dataTableTypes';
import { DataTableVariant } from '../dataTableTypes';
import type { Theme } from '../../Theme';
import { getMainRepresentative } from '../../../utils/defaultRepresentatives';
import { SELECT_COLUMN_SIZE } from './DataTableHeader';
import { useDataTableContext } from './DataTableContext';
import { shouldOpenInNewTabMouseEvent } from 'src/utils/domEvent';
import { Button, Checkbox } from '../../ds';

const cellContainerStyle = (theme: Theme) => ({
  display: 'flex',
  height: theme.spacing(6),
  alignItems: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: '0 0 auto',
});

const DataTableLineDummy = () => {
  const theme = useTheme<Theme>();
  const { columns, tableWidthState: [tableWidth] } = useDataTableContext();
  return (
    <div style={{ display: 'flex' }}>
      {columns.filter((c) => c.visible).map((column) => (
        <div
          key={column.id}
          style={{
            paddingLeft: theme.spacing(0.5),
            paddingRight: theme.spacing(1),
            flex: '0 0 auto',
            width: column.percentWidth
              ? Math.round(tableWidth * (column.percentWidth / 100))
              : SELECT_COLUMN_SIZE,
          }}
        >
          <Skeleton variant="text" height={35} />
        </div>
      ))}
    </div>
  );
};

export const DataTableLinesDummy = ({ number = 10 }: { number?: number }) => (
  <>
    {Array(Math.min(number, 25)).fill(0).map((_, idx) => (
      <DataTableLineDummy key={idx} />
    ))}
  </>
);

const DataTableCell = ({
  cell,
  data,
}: DataTableCellProps) => {
  const theme = useTheme<Theme>();
  const { useDataCellHelpers, tableWidthState: [tableWidth] } = useDataTableContext();
  const helpers = useDataCellHelpers(cell);

  const cellStyle: CSSProperties = {
    display: 'flex',
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    width: '100%',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    fontSize: '13px',
  };

  return (
    <div
      role="gridcell"
      key={`${cell.id}_${data.id}`}
      style={{
        ...cellContainerStyle(theme),
        width: Math.round(tableWidth * (cell.percentWidth / 100)),
      }}
    >
      <div style={cellStyle}>
        {cell.render?.(data, helpers) ?? (<div>-</div>)}
      </div>
    </div>
  );
};

const DataTableLine = ({
  row,
  index,
  onToggleShiftEntity,
}: DataTableLineProps) => {
  const navigate = useNavigate();
  const theme = useTheme<Theme>();
  const [isHovered, setIsHovered] = useState(false);

  const {
    columns,
    useLineData,
    getComputeLink,
    actions,
    icon,
    disableNavigation,
    onLineClick,
    selectOnLineClick,
    variant,
    startsWithAction,
    startsWithIcon,
    startColumnWidth,
    endsWithAction,
    endsWithNavigate,
    actionsColumnWidth,
    useDataTableToggle: {
      selectAll,
      deSelectedElements,
      selectedElements,
      onToggleEntity,
    },
    useDataTablePaginationLocalStorage: {
      viewStorage: { redirectionMode },
    },
    formatter: { t_i18n },
  } = useDataTableContext();

  const data = useLineData(row);

  // Memoize link to avoid recomputations
  let link = useMemo(() => getComputeLink(data), [data]);
  if (redirectionMode && redirectionMode !== 'overview' && link !== undefined) {
    link = `${link}/${redirectionMode}`;
  }

  const navigable = !disableNavigation && !onLineClick && !selectOnLineClick && !!link;
  const clickable = !!(navigable || selectOnLineClick || onLineClick);

  const handleSelectLine = (event: React.MouseEvent) => {
    if (event.shiftKey) {
      onToggleShiftEntity(index, data, event);
    } else {
      onToggleEntity(data, event);
    }
  };

  // A row's own action menus mount their drawers and dialogs inside this
  // subtree but render through a portal, and React bubbles their clicks back
  // here. Only a click physically inside the row is a row click.
  const isRowTarget = (event: React.MouseEvent) => event.currentTarget.contains(event.target as Node);

  const handleNavigate = (event: React.MouseEvent) => {
    if (!navigable || !link || !isRowTarget(event)) return;
    event.preventDefault();
    event.stopPropagation();

    if (shouldOpenInNewTabMouseEvent(event)) {
      window.open(link, '_blank');
    } else {
      navigate(link);
    }
  };

  const handleRowClick = (event: React.MouseEvent) => {
    if (!clickable || !isRowTarget(event)) return;
    event.preventDefault();
    event.stopPropagation();

    if (selectOnLineClick) {
      handleSelectLine(event);
    } else if (onLineClick) {
      onLineClick(data);
    } else {
      handleNavigate(event);
    }
  };

  // A row is "selected" using the exact same source of truth the header's select-all
  // checkbox and the row's own checkbox read from - see the identical expression below.
  const isSelected = (selectAll && !((data.id || 'id') in (deSelectedElements || {})))
    || (data.id || 'id') in (selectedElements || {});

  /*
   * Selected takes visual precedence over hover (a selected row stays visually "selected"
   * even while the pointer is over it); otherwise hover gets its own, lighter tint.
   * Both colors are ds/tokens.css CSS custom properties, resolved via `var(...)` - this works
   * regardless of this file living outside `src/components/ds/`, unlike a Tailwind utility
   * class (see ds/tokens.css:17-18): a CSS custom property reference is not Tailwind-scanned
   * source text, so it carries no risk of silently compiling to no CSS.
   */
  const linkStyle: CSSProperties = {
    display: 'flex',
    color: 'inherit',
    // Longhand, not the `borderBottom` shorthand: a shorthand whose color is an unresolved
    // CSS custom property is valid in every real browser, but jsdom's style parser (used by
    // this file's own tests) silently drops the whole shorthand to `none` when it can't
    // resolve `var(--border)` eagerly - see DataTableLine.test.tsx's ROW_HEIGHT test.
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: 'var(--border)',
    backgroundColor: isSelected ? 'var(--accent)' : (isHovered ? 'var(--muted)' : undefined),
    cursor: clickable ? 'pointer' : 'unset',
  };

  const columnsOffset = useMemo(
    () => [startsWithAction, startsWithIcon].filter(Boolean).length,
    [startsWithAction, startsWithIcon],
  );

  return (
    // This row is a purely presentational hover container: the row's actual interactive
    // affordance (click/keyboard activation) lives entirely on the nested, already-focusable
    // `<a>` below, so this element itself needs no tab stop of its own.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      role="row"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <a
        style={linkStyle}
        href={navigable ? link : undefined}
        // We need both to handle accessibility and widget.
        onClick={variant !== DataTableVariant.widget
          ? handleRowClick
          : (variant === DataTableVariant.widget ? handleNavigate : undefined)}
        data-testid={getMainRepresentative(data)}
      >
        {(startsWithAction || startsWithIcon) && (
          <div
            key={`select_${data.id}`}
            style={{
              ...cellContainerStyle(theme),
              width: startColumnWidth,
            }}
          >
            {startsWithAction && (
              <Checkbox
                aria-label={t_i18n('Select line')}
                onClick={handleSelectLine}
                style={{ marginInlineStart: 8, marginInlineEnd: 8 }}
                checked={isSelected}
              />
            )}
            {(startsWithIcon && icon) && (
              <div style={{ display: 'flex', paddingLeft: 10 }}>
                {icon(data)}
              </div>
            )}
          </div>
        )}

        {columns.filter((c) => c.visible).slice(columnsOffset, (actions || disableNavigation) ? undefined : -1).map((column) => (
          <DataTableCell
            key={column.id}
            cell={column}
            data={data}
          />
        ))}

        {endsWithAction && (
          <div
            key={`navigate_${data.id}`}
            style={{
              ...cellContainerStyle(theme),
              width: actionsColumnWidth ?? SELECT_COLUMN_SIZE,
              overflow: 'initial',
            }}
          >
            {actions && actions(data)}
            {endsWithNavigate && (
              <Button
                iconOnly
                variant="secondary"
                appearance="ghost"
                size="sm"
                aria-label={t_i18n('Open link')}
                onClick={() => (link ? navigate(link) : undefined)}
              >
                <KeyboardArrowRightOutlined fontSize="small" />
              </Button>
            )}
          </div>
        )}
      </a>
    </div>
  );
};

export default DataTableLine;
