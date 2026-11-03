import React, { type Dispatch, type SetStateAction, useCallback, useEffect } from 'react';
import { TableTuneIcon } from 'filigran-icon';
import FiligranIcon from '@components/common/FiligranIcon';
import { Menu, MenuCheckboxItem, MenuContent, MenuItem, MenuSub, MenuSubContent, MenuSubTrigger, MenuTrigger, Pagination, Tooltip } from '../ds';
import { useFormatter } from '../i18n';
import { NumberOfElements } from '../../utils/hooks/useLocalStorage';
import { useDataTableContext } from './components/DataTableContext';

const PAGE_SIZE_OPTIONS = ['10', '25', '50', '100'];

const DataTablePagination = ({
  page,
  setPage,
  numberOfElements: unstoreNOE,
  redirectionModeEnabled = false,
}: {
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  numberOfElements?: NumberOfElements;
  redirectionModeEnabled?: boolean;
}) => {
  const { t_i18n } = useFormatter();

  const {
    columns,
    setColumns,
    resetColumns,
    useDataTablePaginationLocalStorage: {
      viewStorage: {
        pageSize,
        numberOfElements: storedNOE = { original: 0, number: 0, symbol: '' },
      },
      helpers,
    },
  } = useDataTableContext();

  const numberOfElements = unstoreNOE ?? storedNOE;

  // if the number of elements object changes, it means we have changed the filter or search
  // we reset to page 1 (we might be out-of-bound in this new context)
  useEffect(() => {
    setPage(1);
  }, [numberOfElements]);

  const items = pageSize ? Number.parseInt(pageSize, 10) : 25;
  const firstItem = items * ((page ?? 1) - 1) + 1;
  const lastItem = Math.min(firstItem + items - 1, numberOfElements.original ?? 0);

  const fetchMore = useCallback((direction = 'forward') => {
    let nextPage;
    if (direction === 'previous' && page > 1) {
      nextPage = page - 1;
      setPage(nextPage);
    } else {
      nextPage = page + 1;
      setPage(nextPage);
    }
  }, [page, pageSize]);

  const handleToggleVisibility = (columnId: string) => {
    setColumns((prevColumns) => prevColumns.map((column) => (
      column.id === columnId
        ? { ...column, visible: !column.visible }
        : column
    )));
  };

  const resetTable = () => {
    resetColumns();
    helpers.handleAddProperty('pageSize', '25');
  };

  const visibleColumnOptions = (columns ?? []).filter(({ id }) => !['select', 'navigate', 'icon'].includes(id));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Pagination
        onPrevious={() => fetchMore('previous')}
        onNext={() => fetchMore('forward')}
        previousDisabled={firstItem === 1}
        nextDisabled={lastItem === numberOfElements.original}
      >
        <Tooltip
          trigger={(
            <span data-testid="dataTablePaginationResultCount" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span>{`${lastItem ? firstItem : 0} - ${lastItem} `}</span>
              <span style={{ opacity: 0.6 }}>
                {`/ ${numberOfElements.number}${numberOfElements.symbol}`}
              </span>
            </span>
          )}
          content={(
            <div>
              <strong>{`${numberOfElements.original}`}</strong>{' '}
              {t_i18n('entitie(s)')}
            </div>
          )}
        />
      </Pagination>
      <Menu>
        <MenuTrigger>
          <button
            type="button"
            aria-label={t_i18n('Table settings')}
            // `ds/tokens.css`'s Tailwind utilities only compile for files under `src/components/ds/`
            // (see `ds/tokens.css:17-18`'s `@source "./"`), so this file-local trigger is styled via
            // inline style + the library's own CSS custom properties, not a Tailwind class.
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 'var(--ds-radius-md)',
            }}
          >
            <FiligranIcon icon={TableTuneIcon} size={20} />
          </button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem onClick={resetTable}>{t_i18n('Reset table')}</MenuItem>
          {columns.length > 0 && (
            <MenuSub>
              <MenuSubTrigger>{t_i18n('Columns')}</MenuSubTrigger>
              <MenuSubContent>
                {visibleColumnOptions.map((column) => (
                  <MenuCheckboxItem
                    key={column.id}
                    checked={column.visible}
                    onCheckedChange={() => handleToggleVisibility(column.id)}
                  >
                    {t_i18n(column.label ?? column.id)}
                  </MenuCheckboxItem>
                ))}
              </MenuSubContent>
            </MenuSub>
          )}
          <MenuSub>
            <MenuSubTrigger>{t_i18n('Rows per page')}</MenuSubTrigger>
            <MenuSubContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <MenuItem key={size} onClick={() => helpers.handleAddProperty('pageSize', size)}>
                  {size}
                </MenuItem>
              ))}
            </MenuSubContent>
          </MenuSub>
          {redirectionModeEnabled && (
            <MenuSub>
              <MenuSubTrigger>{t_i18n('Redirection mode')}</MenuSubTrigger>
              <MenuSubContent>
                <MenuItem onClick={() => helpers.handleAddProperty('redirectionMode', 'overview')}>
                  {t_i18n('Redirecting to the Overview section')}
                </MenuItem>
                <MenuItem onClick={() => helpers.handleAddProperty('redirectionMode', 'knowledge')}>
                  {t_i18n('Redirecting to the Knowledge section')}
                </MenuItem>
                <MenuItem onClick={() => helpers.handleAddProperty('redirectionMode', 'content')}>
                  {t_i18n('Redirecting to the Content section')}
                </MenuItem>
              </MenuSubContent>
            </MenuSub>
          )}
        </MenuContent>
      </Menu>
    </div>
  );
};

export default DataTablePagination;
