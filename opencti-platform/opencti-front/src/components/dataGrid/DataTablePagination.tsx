import React, { type Dispatch, type SetStateAction, useCallback, useEffect } from 'react';
import { TableTuneIcon } from 'filigran-icon';
import FiligranIcon from '@components/common/FiligranIcon';
import { Button, Menu, MenuCheckboxItem, MenuContent, MenuItem, MenuSub, MenuSubContent, MenuSubTrigger, MenuTrigger, Pagination, Tooltip } from '../ds';
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
        redirectionMode,
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

  // Mirrors the original `selected: !pageSize || pageSize === '25'` default-to-25 rule (pageSize
  // is unset until the user picks a non-default value).
  const isActivePageSize = (size: string) => (pageSize ? pageSize === size : size === '25');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Pagination
        onPrevious={() => fetchMore('previous')}
        onNext={() => fetchMore('forward')}
        previousDisabled={firstItem === 1}
        nextDisabled={lastItem === numberOfElements.original}
        previousLabel={t_i18n('Previous')}
        nextLabel={t_i18n('Next')}
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
          {/* Same icon-only ghost button as the export button and row actions, so it gets the library's hover/focus-visible states. */}
          <Button
            iconOnly
            variant="secondary"
            appearance="ghost"
            size="sm"
            aria-label={t_i18n('Table settings')}
          >
            <FiligranIcon icon={TableTuneIcon} size={20} />
          </Button>
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
                <MenuCheckboxItem
                  key={size}
                  checked={isActivePageSize(size)}
                  onCheckedChange={() => helpers.handleAddProperty('pageSize', size)}
                  // Single-select, not multi-select like "Columns": picking a page size closes
                  // the whole menu, matching the pre-restyle NestedMenuButton's
                  // handleClickOption, which called handleClose(0) for every leaf option unless
                  // keepMenuOpen was explicitly set (it never was, for this group).
                  closeOnClick
                >
                  {size}
                </MenuCheckboxItem>
              ))}
            </MenuSubContent>
          </MenuSub>
          {redirectionModeEnabled && (
            <MenuSub>
              <MenuSubTrigger>{t_i18n('Redirection mode')}</MenuSubTrigger>
              <MenuSubContent>
                {/*
                  Single-select, not multi-select like "Columns": picking a redirection mode
                  closes the whole menu, matching the pre-restyle NestedMenuButton's
                  handleClickOption, which called handleClose(0) for every leaf option unless
                  keepMenuOpen was explicitly set (it never was, for this group).
                */}
                <MenuCheckboxItem
                  checked={redirectionMode === 'overview'}
                  onCheckedChange={() => helpers.handleAddProperty('redirectionMode', 'overview')}
                  closeOnClick
                >
                  {t_i18n('Redirecting to the Overview section')}
                </MenuCheckboxItem>
                <MenuCheckboxItem
                  checked={redirectionMode === 'knowledge'}
                  onCheckedChange={() => helpers.handleAddProperty('redirectionMode', 'knowledge')}
                  closeOnClick
                >
                  {t_i18n('Redirecting to the Knowledge section')}
                </MenuCheckboxItem>
                <MenuCheckboxItem
                  checked={redirectionMode === 'content'}
                  onCheckedChange={() => helpers.handleAddProperty('redirectionMode', 'content')}
                  closeOnClick
                >
                  {t_i18n('Redirecting to the Content section')}
                </MenuCheckboxItem>
              </MenuSubContent>
            </MenuSub>
          )}
        </MenuContent>
      </Menu>
    </div>
  );
};

export default DataTablePagination;
