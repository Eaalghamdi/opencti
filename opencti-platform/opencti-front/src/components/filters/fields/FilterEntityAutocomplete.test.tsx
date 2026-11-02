import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { FilterDefinition } from '../../../utils/hooks/useAuth';
import type { Filter, handleFilterHelpers } from '../../../utils/filters/filtersHelpers-types';
import testRender, { createMockUserContext } from '../../../utils/tests/test-render';

// Records the text of each search the autocomplete triggers
const searchedValues = vi.hoisted(() => [] as string[]);
vi.mock('../../../utils/filters/useSearchEntities', () => ({
  default: () => [{}, (_key: string, _cache: unknown, _setCache: unknown, event: { target: { value: string } }) => {
    searchedValues.push(event.target.value);
  }],
}));

vi.mock('../../../relay/environment', () => ({
  APP_BASE_PATH: '',
  MESSAGING$: { messages$: { subscribe: () => ({}) } },
  environment: {},
  fetchQuery: vi.fn(),
}));

vi.mock('../../../utils/hooks/useAttributes', () => ({
  default: () => ({ typesWithFintelTemplates: [], stixCoreObjectTypes: [] }),
}));

import FilterEntityAutocomplete from './FilterEntityAutocomplete';
import { FilterEditorProvider } from './FilterEditorContext';

const filterKeysSchema = new Map([
  ['Stix-Core-Object', new Map([
    ['createdBy', {
      filterKey: 'createdBy',
      type: 'id',
      label: 'Author',
      multiple: true,
      subEntityTypes: ['Stix-Core-Object'],
      elementsForFilterValuesSearch: ['Identity'],
    } as FilterDefinition],
    ['objects', {
      filterKey: 'objects',
      type: 'id',
      label: 'Contains',
      multiple: true,
      subEntityTypes: ['Stix-Core-Object'],
      elementsForFilterValuesSearch: ['Stix-Core-Object'],
    } as FilterDefinition],
  ])],
]);

const authorFilter: Filter = { id: 'filter-1', key: 'createdBy', operator: 'eq', values: [], mode: 'or' };

const buildHelpers = () => ({
  handleSwitchGlobalMode: vi.fn(),
  handleSwitchLocalMode: vi.fn(),
  handleRemoveRepresentationFilter: vi.fn(),
  handleRemoveFilterById: vi.fn(),
  handleChangeOperatorFilters: vi.fn(),
  handleAddSingleValueFilter: vi.fn(),
  handleAddRepresentationFilter: vi.fn(),
  handleAddFilterWithEmptyValue: vi.fn(),
  handleAddFilterGroup: vi.fn(),
  handleRemoveFilterGroup: vi.fn(),
  handleClearAllFilters: vi.fn(),
  getLatestAddFilterId: vi.fn(),
  handleChangeRepresentationFilter: vi.fn(),
  handleReplaceFilterValues: vi.fn(),
  handleChangeFilterKey: vi.fn(),
}) as handleFilterHelpers & Record<string, ReturnType<typeof vi.fn>>;

const userContext = createMockUserContext({ schema: { filterKeysSchema } });

describe('FilterEntityAutocomplete', () => {
  it('gives focus back to the input when the search is cleared, searching once for the empty text', async () => {
    const { user } = testRender(
      <FilterEditorProvider availableFilterKeys={[]} entityTypes={['Stix-Core-Object']} filtersRepresentativesMap={new Map()}>
        <FilterEntityAutocomplete filter={authorFilter} filterKey="createdBy" setInputValues={vi.fn()} label="Author" />
      </FilterEditorProvider>,
      { userContext },
    );

    const input = screen.getByRole('combobox', { name: 'Author' });
    await user.type(input, 'acme');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Clear search' })).toHaveFocus();

    searchedValues.length = 0;
    await user.keyboard('{Enter}');

    expect(input).toHaveFocus();
    expect(input).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    expect(searchedValues).toEqual(['']);
  });

  it('renders selected options as chips in selection order', () => {
    const filter: Filter = { id: 'filter-1', key: 'createdBy', operator: 'eq', values: ['id-bob', 'id-alice'], mode: 'or' };
    const filtersRepresentativesMap = new Map([
      ['id-alice', { value: 'Alice', entity_type: 'Individual', color: null, representativeId: 'id-alice' }],
      ['id-bob', { value: 'Bob', entity_type: 'Individual', color: null, representativeId: 'id-bob' }],
    ]);
    testRender(
      <FilterEditorProvider availableFilterKeys={[]} entityTypes={['Stix-Core-Object']} filtersRepresentativesMap={filtersRepresentativesMap}>
        <FilterEntityAutocomplete filter={filter} filterKey="createdBy" setInputValues={vi.fn()} label="Author" />
      </FilterEditorProvider>,
      { userContext },
    );

    // getSelectedOptions (useFilterEntityOptions, untouched) sorts selected options
    // alphabetically by label regardless of filter.values order - Alice must render
    // before Bob in document order.
    const alice = screen.getByText('Alice');
    const bob = screen.getByText('Bob');
    expect(alice.compareDocumentPosition(bob) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders a locked (non-removable) chip with an explanatory tooltip when disabled and exactly one value is locked', async () => {
    const filter: Filter = { id: 'filter-1', key: 'createdBy', operator: 'eq', values: ['id-alice'], mode: 'or' };
    const filtersRepresentativesMap = new Map([
      ['id-alice', { value: 'Alice', entity_type: 'Individual', color: null, representativeId: 'id-alice' }],
    ]);
    const { user } = testRender(
      <FilterEditorProvider availableFilterKeys={[]} entityTypes={['Stix-Core-Object']} filtersRepresentativesMap={filtersRepresentativesMap}>
        <FilterEntityAutocomplete filter={filter} filterKey="createdBy" setInputValues={vi.fn()} label="Author" disabled />
      </FilterEditorProvider>,
      { userContext },
    );

    const chipLabel = screen.getByText('Alice');
    expect(chipLabel.closest('[aria-disabled="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Alice' })).not.toBeInTheDocument();
    // "Clear all" would also empty the sole locked value: hidden the same way.
    expect(screen.queryByLabelText('Clear all')).not.toBeInTheDocument();

    await user.hover(chipLabel);
    expect(await screen.findByText('Cannot be removed: the relationship type is required when a filter is configured')).toBeInTheDocument();
  });

  it('renders the AND/OR mode toggle between two chips, not before the first or after the last, and clicking it switches the local mode', async () => {
    const filter: Filter = { id: 'filter-1', key: 'createdBy', operator: 'eq', values: ['id-alice', 'id-bob'], mode: 'or' };
    const filtersRepresentativesMap = new Map([
      ['id-alice', { value: 'Alice', entity_type: 'Individual', color: null, representativeId: 'id-alice' }],
      ['id-bob', { value: 'Bob', entity_type: 'Individual', color: null, representativeId: 'id-bob' }],
    ]);
    const helpers = buildHelpers();
    const { user } = testRender(
      <FilterEditorProvider
        helpers={helpers}
        availableFilterKeys={[]}
        entityTypes={['Stix-Core-Object']}
        filtersRepresentativesMap={filtersRepresentativesMap}
      >
        <FilterEntityAutocomplete filter={filter} filterKey="createdBy" setInputValues={vi.fn()} label="Author" />
      </FilterEditorProvider>,
      { userContext },
    );

    const alice = screen.getByText('Alice');
    const toggle = screen.getByRole('button', { name: 'OR' });
    const bob = screen.getByText('Bob');
    // Between the two chips: after Alice, before Bob - never before the first or after the last.
    expect(alice.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toggle.compareDocumentPosition(bob) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(toggle);
    expect(helpers.handleSwitchLocalMode).toHaveBeenCalledWith(filter);
  });

  it('typing in the input triggers a new search and updates inputValue', async () => {
    const { user } = testRender(
      <FilterEditorProvider availableFilterKeys={[]} entityTypes={['Stix-Core-Object']} filtersRepresentativesMap={new Map()}>
        <FilterEntityAutocomplete filter={authorFilter} filterKey="createdBy" setInputValues={vi.fn()} label="Author" />
      </FilterEditorProvider>,
      { userContext },
    );

    const input = screen.getByRole('combobox', { name: 'Author' });
    searchedValues.length = 0;
    await user.type(input, 'acme');

    expect(input).toHaveValue('acme');
    expect(searchedValues).toEqual(['a', 'ac', 'acm', 'acme']);
  });

  it('renders the SearchScopeElement adornment for stix-object-type filter keys', () => {
    const objectsFilter: Filter = { id: 'filter-1', key: 'objects', operator: 'eq', values: [], mode: 'or' };
    testRender(
      <FilterEditorProvider availableFilterKeys={[]} entityTypes={['Stix-Core-Object']} filtersRepresentativesMap={new Map()}>
        <FilterEntityAutocomplete filter={objectsFilter} filterKey="objects" setInputValues={vi.fn()} label="Contains" />
      </FilterEditorProvider>,
      { userContext },
    );

    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    // The search-scope adornment replaces the plain combobox's own clear-all/dropdown
    // controls for this filter key, so neither renders alongside it.
    expect(screen.queryByLabelText('Clear all')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Open')).not.toBeInTheDocument();
  });

  it('does not render the SearchScopeElement adornment for a non stix-object-type filter key', () => {
    testRender(
      <FilterEditorProvider availableFilterKeys={[]} entityTypes={['Stix-Core-Object']} filtersRepresentativesMap={new Map()}>
        <FilterEntityAutocomplete filter={authorFilter} filterKey="createdBy" setInputValues={vi.fn()} label="Author" />
      </FilterEditorProvider>,
      { userContext },
    );

    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Open')).toBeInTheDocument();
  });
});

describe('FilterEntityAutocomplete, used within a FilterRow (locked relationship_type)', () => {
  // Regression guard for the pre-existing FilterRow.test.tsx / CompositeRegardingOfFilterEditor.test.tsx
  // expectations this migration must keep satisfying: a "Remove <label>" chip-remove button and a
  // "Clear all" control when not locked, neither when locked.
  it('keeps the un-locked relationship_type value both removable and clearable', () => {
    const filter: Filter = { id: 'filter-dyn', key: 'dynamicRegardingOf', operator: 'eq', mode: 'or', values: [{ key: 'relationship_type', values: ['targets'] }] };
    const filtersRepresentativesMap = new Map([
      ['targets', { value: 'Targets', entity_type: 'Relationship', color: null, representativeId: 'targets' }],
    ]);
    const filterKeysSchemaWithRelationshipType = new Map([
      ['Stix-Core-Object', new Map([
        ['dynamicRegardingOf', {
          filterKey: 'dynamicRegardingOf',
          type: 'nested',
          label: 'In regards of (dynamic)',
          multiple: true,
          subEntityTypes: ['Stix-Core-Object'],
          elementsForFilterValuesSearch: [],
          subFilters: [{
            filterKey: 'relationship_type',
            type: 'id',
            label: 'Relationship type',
            multiple: true,
            subEntityTypes: ['Stix-Core-Object'],
            elementsForFilterValuesSearch: [],
          }],
        } as unknown as FilterDefinition],
      ])],
    ]);
    testRender(
      <FilterEditorProvider availableFilterKeys={[]} entityTypes={['Stix-Core-Object']} filtersRepresentativesMap={filtersRepresentativesMap}>
        <FilterEntityAutocomplete filter={filter} filterKey="dynamicRegardingOf" subKey="relationship_type" setInputValues={vi.fn()} label="Relationship type" />
      </FilterEditorProvider>,
      { userContext: createMockUserContext({ schema: { filterKeysSchema: filterKeysSchemaWithRelationshipType } }) },
    );

    expect(screen.getByRole('button', { name: 'Remove Targets' })).toBeInTheDocument();
    expect(screen.getByLabelText('Clear all')).toBeInTheDocument();
  });
});
