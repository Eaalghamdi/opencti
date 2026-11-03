import Filters from '@components/common/lists/Filters';
import StixCoreObjectsExports from '@components/common/stix_core_objects/StixCoreObjectsExports';
import StixCoreRelationshipsExports from '@components/common/stix_core_relationships/StixCoreRelationshipsExports';
import StixDomainObjectsExports from '@components/common/stix_domain_objects/StixDomainObjectsExports';
import StixCyberObservablesExports from '@components/observations/stix_cyber_observables/StixCyberObservablesExports';
import { FileDownloadOutlined } from '@mui/icons-material';
import { ToggleButtonGroup } from '@mui/material';
import { Theme, useTheme } from '@mui/material/styles';
import { ExportContext } from '../../utils/ExportContextProvider';
import { isFilterGroupNotEmpty, canonicalizeFilterGroupForBackend } from '../../utils/filters/filtersUtils';
import { FilterGroup } from '../../utils/filters/filtersHelpers-types';
import useEntityToggle from '../../utils/hooks/useEntityToggle';
import { KNOWLEDGE_KNGETEXPORT } from '../../utils/hooks/useGranted';
import Security from '../../utils/Security';
import { export_max_size } from '../../utils/utils';
import FilterIconButton from '../FilterIconButton';
import { useFormatter } from '../i18n';
import { Button, Tooltip } from '../ds';
import { useDataTableContext } from './components/DataTableContext';
import DataTablePagination from './DataTablePagination';
import { DataTableDisplayFiltersProps, DataTableFiltersProps, DataTableVariant } from './dataTableTypes';

export const DataTableDisplayFilters = ({
  availableFilterKeys,
  availableRelationFilterTypes,
  availableEntityTypes,
  entityTypes,
  searchContext,
}: DataTableDisplayFiltersProps) => {
  const {
    useDataTablePaginationLocalStorage: {
      helpers,
      viewStorage: { filters, savedFilters },
    },
  } = useDataTableContext();

  return (
    <div id="filter-container" style={{ display: 'flex', alignItems: 'center' }}>
      <FilterIconButton
        helpers={helpers}
        availableFilterKeys={availableFilterKeys}
        filters={filters}
        handleRemoveFilter={helpers.handleRemoveFilter}
        handleSwitchGlobalMode={helpers.handleSwitchGlobalMode}
        handleSwitchLocalMode={helpers.handleSwitchLocalMode}
        availableRelationFilterTypes={availableRelationFilterTypes}
        availableEntityTypes={availableEntityTypes}
        entityTypes={entityTypes}
        hasSavedFilters={!!savedFilters}
        redirection
        searchContext={searchContext}
      />
    </div>
  );
};

/**
 * Builds the filter group sent to the export mutations: the context filters and the current
 * filters are kept as two sibling groups, and the frontend-only ids are stripped at any depth.
 */
export const buildExportFilterGroup = (contextFilters?: FilterGroup | null, filters?: FilterGroup | null): FilterGroup => {
  const exportFilterGroups: FilterGroup[] = [];
  if (isFilterGroupNotEmpty(contextFilters)) {
    exportFilterGroups.push(canonicalizeFilterGroupForBackend(contextFilters!));
  }
  if (isFilterGroupNotEmpty(filters)) {
    exportFilterGroups.push(canonicalizeFilterGroupForBackend(filters!));
  }
  return {
    mode: 'and',
    filters: [],
    filterGroups: exportFilterGroups,
  };
};

const DataTableFilters = ({
  contextFilters,
  availableFilterKeys,
  searchContextFinal,
  availableEntityTypes,
  availableRelationshipTypes,
  availableRelationFilterTypes,
  paginationOptions,
  exportContext,
  currentView,
  additionalHeaderButtons,
  additionalHeaderToggleButtons: additionalToggleButtons,
  hideSavedFilters = false,
}: DataTableFiltersProps) => {
  const theme = useTheme<Theme>();
  const { t_i18n } = useFormatter();

  const {
    storageKey,
    redirectionModeEnabled,
    variant,
    createButton,
    page,
    setPage,
    useDataTablePaginationLocalStorage: {
      helpers,
      viewStorage: { numberOfElements, openExports },
    },
  } = useDataTableContext();
  const { selectedElements } = useEntityToggle(storageKey);

  const exportDisabled = !exportContext || (numberOfElements
    && ((Object.keys(selectedElements).length > export_max_size
      && numberOfElements.number > export_max_size)
    || (Object.keys(selectedElements).length === 0
      && numberOfElements.number > export_max_size)));

  const hasFilters = availableFilterKeys && availableFilterKeys.length > 0;

  const exportPaginationOptions = {
    ...paginationOptions,
    filters: buildExportFilterGroup(contextFilters, paginationOptions.filters),
  };

  return (
    <ExportContext.Provider value={{ selectedIds: Object.keys(selectedElements) }}>
      {/* `alignItems: center`: without it the row defaults to `stretch`, so the left group (which centres its own
          children) and the right group of 36px toggles resolved to different centre lines — measured 305 against
          303 on the entity Analyses tab, which is the 2px misalignment reported there. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing(1),
        }}
        >
          {hasFilters && (
            <Filters
              isDatatable
              helpers={helpers}
              variant={variant}
              searchContext={searchContextFinal}
              availableFilterKeys={availableFilterKeys}
              handleAddFilter={helpers.handleAddFilter}
              handleSwitchFilter={helpers.handleSwitchFilter}
              handleRemoveFilter={helpers.handleRemoveFilter}
              handleSwitchGlobalMode={helpers.handleSwitchGlobalMode}
              handleSwitchLocalMode={helpers.handleSwitchLocalMode}
              availableEntityTypes={availableEntityTypes}
              availableRelationshipTypes={availableRelationshipTypes}
              availableRelationFilterTypes={availableRelationFilterTypes}
              hideSavedFilters={hideSavedFilters}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: theme.spacing(1), flexShrink: 0 }}>
          {(variant === DataTableVariant.default) && (
            <DataTablePagination
              page={page}
              setPage={setPage}
              numberOfElements={numberOfElements}
              redirectionModeEnabled={redirectionModeEnabled}
            />
          )}

          {/*
            `additionalToggleButtons` are raw MUI `ToggleButton` elements built by other,
            out-of-scope call sites (e.g. Malwares.tsx, Campaigns.tsx) that rely on MUI's
            `ToggleButtonGroupContext` for their `selected` state and `onChange` wiring - there
            is no `onClick` of their own. A `ds/` equivalent of `ToggleButtonGroup` doesn't exist
            yet, and migrating it would mean rewriting those call sites too, well beyond this
            file. So this group stays MUI, scoped to only the buttons it must carry; the "export"
            action below (owned entirely by this file) is pulled out and restyled onto `ds/`.
          */}
          {additionalToggleButtons && additionalToggleButtons.length > 0 && (
            <ToggleButtonGroup
              size="small"
              color="primary"
              value={currentView || 'lines'}
              exclusive={true}
              onChange={(_, value) => {
                if (value && value !== 'export-csv') {
                  helpers.handleChangeView(value);
                }
              }}
            >
              {[...additionalToggleButtons]}
            </ToggleButtonGroup>
          )}
          {!exportDisabled && (
            <Tooltip
              trigger={(
                <Button
                  iconOnly
                  variant="secondary"
                  appearance="ghost"
                  size="sm"
                  aria-label={t_i18n('Open export panel')}
                  onClick={() => helpers.handleToggleExports()}
                >
                  <FileDownloadOutlined fontSize="small" />
                </Button>
              )}
              content={t_i18n('Open export panel')}
            />
          )}

          {additionalHeaderButtons && additionalHeaderButtons.length > 0 && (
            <div style={{ display: 'flex', gap: theme.spacing(1) }}>
              {[...additionalHeaderButtons]}
            </div>
          )}

          {createButton}
        </div>
      </div>
      {exportContext
        && exportContext.entity_type !== 'Stix-Core-Object'
        && exportContext.entity_type !== 'Stix-Cyber-Observable'
        && exportContext.entity_type !== 'stix-core-relationship' && (
        <Security needs={[KNOWLEDGE_KNGETEXPORT]}>
          <StixDomainObjectsExports
            open={!!openExports}
            handleToggle={helpers.handleToggleExports}
            paginationOptions={exportPaginationOptions}
            exportContext={exportContext}
          />
        </Security>
      )}
      {helpers.handleToggleExports && exportContext
        && exportContext.entity_type === 'stix-core-relationship' && (
        <Security needs={[KNOWLEDGE_KNGETEXPORT]}>
          <StixCoreRelationshipsExports
            open={openExports}
            handleToggle={helpers.handleToggleExports}
            paginationOptions={exportPaginationOptions}
            exportContext={exportContext}
          />
        </Security>
      )}
      {helpers.handleToggleExports && exportContext
        && exportContext.entity_type === 'Stix-Core-Object' && (
        <Security needs={[KNOWLEDGE_KNGETEXPORT]}>
          <StixCoreObjectsExports
            open={openExports}
            handleToggle={helpers.handleToggleExports}
            paginationOptions={exportPaginationOptions}
            exportContext={exportContext}
            exportType={undefined}
          />
        </Security>
      )}
      {helpers.handleToggleExports && exportContext
        && exportContext.entity_type === 'Stix-Cyber-Observable' && (
        <Security needs={[KNOWLEDGE_KNGETEXPORT]}>
          <StixCyberObservablesExports
            open={openExports}
            handleToggle={helpers.handleToggleExports}
            paginationOptions={exportPaginationOptions}
            exportContext={exportContext}
          />
        </Security>
      )}
    </ExportContext.Provider>
  );
};

export default DataTableFilters;
