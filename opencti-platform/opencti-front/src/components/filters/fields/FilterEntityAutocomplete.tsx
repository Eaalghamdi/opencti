import { FilterOptionValue } from '@components/common/lists/FilterAutocomplete';
import SearchScopeElement from '@components/common/lists/SearchScopeElement';
import { useTheme } from '@mui/material/styles';
import { HighlightOffOutlined } from '@mui/icons-material';
import { IconButton, Tooltip, TooltipContent, TooltipTrigger } from '@filigran/design-system';
import { ChangeEvent, Dispatch, Fragment, FunctionComponent, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SetStateAction, SyntheticEvent, useEffect, useId, useRef } from 'react';
import { Filter, FilterEditorInputValue } from '../../../utils/filters/filtersHelpers-types';
import { isStixObjectTypes } from '../../../utils/filters/filtersUtils';
import { useFormatter } from '../../i18n';
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxField,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxTrigger,
} from '../../ds/Combobox';
import { useFilterEditorContext } from './FilterEditorContext';
import FilterEntityOption from './FilterEntityOption';
import useFilterEntityOptions from './useFilterEntityOptions';
import { applyValueChange, AUTOCOMPLETE_KEY_ACTIONS, computeValueChange, getEditedValues, isChangeBlocked } from './filterEntityValueActions';
import { onActivationKey } from '../../../utils/domEvent';

export interface FilterEntityAutocompleteProps {
  filter?: Filter;
  filterKey: string;
  setInputValues: Dispatch<SetStateAction<FilterEditorInputValue[]>>;
  subKey?: string;
  disabled?: boolean;
  label?: string;
}

/**
 * Default value editor of a filter: a multi-select over the entities matching the filter
 * definition, searched server-side through the shared editor state.
 *
 * Split out of FilterValueInput because it is the one value widget that is not a plain
 * controlled input: it owns the entity search, the search-scope adornment and the between-chip
 * AND/OR mode toggle. FilterValueInput falls back to it for every filter type that has no
 * dedicated widget.
 *
 * The search and the option assembly live in `useFilterEntityOptions`, the value semantics
 * in `filterEntityValueActions`; what remains here is the `ds/Combobox` wiring.
 */
const FilterEntityAutocomplete: FunctionComponent<FilterEntityAutocompleteProps> = ({
  filter,
  filterKey,
  setInputValues,
  subKey,
  disabled = false,
  label,
}) => {
  const { t_i18n } = useFormatter();
  const theme = useTheme();
  const inputId = useId();
  const { helpers, availableRelationFilterTypes } = useFilterEditorContext();
  const {
    searchKey,
    options,
    selectedOptions,
    inputValue,
    setInputValue,
    triggerSearch,
    searchScope,
    setSearchScope,
  } = useFilterEntityOptions({
    filter,
    filterKey,
    subKey,
    setInputValues,
  });

  // `ComboboxInput` (ds/Combobox.tsx, not touched by this task) is a plain function
  // component, not wrapped in `forwardRef`, so it carries no `ref` prop to reach the real
  // `<input>` - every place that would otherwise use a ref instead looks it up by the `id`
  // already needed for the `ComboboxLabel` association. `inputId` (from `useId()`) never
  // changes across renders.

  // Same as BasicFilterInput: the operator select is rendered before this field,
  // so without focus on open the value takes an extra Tab to reach — and focusing
  // it is also what triggers the first entity search (see `onFocus` below).
  useEffect(() => {
    (document.getElementById(inputId) as HTMLInputElement | null)?.focus();
  }, [inputId]);

  // ds/Combobox's onValueChange (Combobox.tsx) forwards only the resulting value: Base UI's
  // own root tracks a real reason per gesture - item-press for a list click (which both adds
  // an unselected item and toggles an already-selected one back off, in multi-select),
  // chip-remove-press for `ComboboxChipRemove` below, clear-press for `ComboboxClear` below
  // (see node_modules/@base-ui-components/react/utils/reason-parts.js) - but `ds/Combobox`
  // drops that reason before it reaches this callback.
  //
  // computeValueChange (untouched, in filterEntityValueActions.ts) still needs to tell a true
  // "clear everything" apart from a single add/remove: its CLEAR branch skips diffing
  // entirely, while its SELECT_OPTION/REMOVE_OPTION branches (otherwise identical - both diff
  // `newValues` against `currentValues` for the one value that changed) return `{type:'none'}`
  // if more than one value changed at once. Reading AriaCombobox.js's `handleSelection` and
  // ComboboxClear.js confirms item-press and chip-remove-press only ever change the array by
  // exactly one entry, while ComboboxClear's clear-press is the only gesture that can set the
  // whole array to `[]` in one call - so the one distinction that matters is reconstructed
  // here from the size of the change alone, with no ambiguity: a single-value array emptied by
  // either gesture resolves to the same final filter values either way (confirmed by reading
  // handleRemoveRepresentationFilterUtil/handleReplaceFilterValuesUtil in filtersManageStateUtil.ts).
  const handleComboboxValueChange = (newValue: FilterOptionValue[]) => {
    const currentValues = getEditedValues(filter, subKey);
    const reason = newValue.length === 0 && currentValues.length > 1
      ? AUTOCOMPLETE_KEY_ACTIONS.CLEAR
      : AUTOCOMPLETE_KEY_ACTIONS.SELECT_OPTION;
    const change = computeValueChange(currentValues, newValue.map((v) => v.value), reason);
    if (change.type === 'add') {
      setInputValue('');
    }
    if (change.type === 'none' || isChangeBlocked(change, currentValues, disabled)) return;
    applyValueChange(change, { helpers, filter, subKey });
  };

  // Set while the clear button hands focus back to the input: that focus must not
  // search again, it would read the input before React empties it.
  const isRefocusingAfterClearRef = useRef(false);

  const handleClearInputValue = () => {
    setInputValue('');
    triggerSearch({ target: { value: '' } } as unknown as SyntheticEvent);
    // The clear button unmounts with the text it clears, and the combobox refocuses the
    // input on any click inside it, right after this handler. Focus it first, flagged, so
    // that refocus is a no-op instead of a search for the old text.
    isRefocusingAfterClearRef.current = true;
    (document.getElementById(inputId) as HTMLInputElement | null)?.focus();
    isRefocusingAfterClearRef.current = false;
  };

  const handleInputFocus = (event: SyntheticEvent) => {
    if (isRefocusingAfterClearRef.current) return;
    triggerSearch(event);
  };

  // Base UI itself distinguishes real typing (`input-change`) from its own programmatic
  // resets (`input-clear`, fired e.g. when the popup closes on blur after the user had
  // typed something - see AriaCombobox.js's close handling), but `ds/Combobox`'s own
  // `onInputChange` (the Combobox-level prop, wired below) drops that reason and fires for
  // both alike - confirmed by reading ComboboxInput.js: the internal resets go through
  // `store.state.setInputValue(...)`, a plain method call, same path as a keystroke.
  // Searching again on every one of those (as AutocompleteField.tsx's own simplified
  // translation of this same gap does) would re-search for '' whenever the field blurs with
  // text still typed - which the pre-existing "gives focus back to the input..." test below
  // proves must NOT happen (blurring must leave the typed text and its search results alone).
  // So this file keeps `onInputChange` at the `Combobox` level only to suppress Combobox's
  // own local substring filtering (see its "trusts options as-is" doc/test - this component
  // already filters server-side) and instead reads real keystrokes from `ComboboxInput`'s own
  // native `onChange` below, which - because it is a real DOM input event - never fires for
  // Base UI's internal resets, only for the user actually typing.
  const suppressComboboxLocalFiltering = () => {};

  const handleNativeInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    triggerSearch(event);
  };

  // `ComboboxLabelProps`/`ComboboxInputProps` (ds/Combobox.tsx, not touched by this task) are
  // typed as plain `HTMLAttributes`, which omits `htmlFor` and `value` - those belong to the
  // more specific `LabelHTMLAttributes`/`InputHTMLAttributes`. Spreading a separately,
  // correctly-typed object sidesteps the resulting excess-property check while still passing
  // the attribute through to the real DOM element at runtime - the same workaround
  // AutocompleteField.tsx already uses for its own `ComboboxLabelProps`/`ComboboxInputProps`.
  const comboboxLabelProps = { htmlFor: inputId } as LabelHTMLAttributes<HTMLLabelElement>;
  const comboboxInputProps = { value: inputValue } as InputHTMLAttributes<HTMLInputElement>;

  const currentValues = getEditedValues(filter, subKey);
  let lastGroup: string | undefined;
  const optionNodes: ReactNode[] = [];
  options.forEach((option) => {
    const group = t_i18n(option?.group ? option.group : label);
    if (group !== lastGroup) {
      lastGroup = group;
      optionNodes.push(
        <div key={`group-${group}`} className="px-2 py-1.5 text-xs font-medium text-[var(--muted-foreground)]">
          {group}
        </div>,
      );
    }
    const checked = currentValues.includes(option.value);
    const optionDisabled = disabled && checked && currentValues.length === 1;
    optionNodes.push(
      <ComboboxItem key={option.value} value={option} disabled={optionDisabled}>
        <FilterEntityOption option={option} checked={checked} disabled={optionDisabled} />
      </ComboboxItem>,
    );
  });

  return (
    <Combobox
      // Forces a full remount on a subKey/filterKey change, same as the old Autocomplete's
      // own `key={searchKey}`: a subfilter's search is keyed under its own `searchKey`.
      key={searchKey}
      multiple
      value={selectedOptions}
      onValueChange={handleComboboxValueChange}
      options={options}
      getOptionLabel={(option) => option.label ?? ''}
      isOptionEqualToValue={(option, val) => option.value === val.value}
      onInputChange={suppressComboboxLocalFiltering}
    >
      {label && <ComboboxLabel {...comboboxLabelProps}>{t_i18n(label)}</ComboboxLabel>}
      <ComboboxField>
        <ComboboxChips>
          {selectedOptions.map((option, index) => {
            const isLockedValue = disabled && selectedOptions.length === 1;
            const chip = isLockedValue
              ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <ComboboxChip disabled>
                          {option.label}
                        </ComboboxChip>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t_i18n('Cannot be removed: the relationship type is required when a filter is configured')}
                    </TooltipContent>
                  </Tooltip>
                )
              : (
                  <ComboboxChip>
                    {option.label}
                    <ComboboxChipRemove aria-label={`Remove ${option.label}`} />
                  </ComboboxChip>
                );
            // A subKey value list (e.g. regardingOf/dynamicRegardingOf's relationship_type) has no
            // mode of its own in the data model (filterEntityValueActions builds `{ key, values }`
            // with no mode) — toggling it here would silently flip the parent filter's mode instead.
            const showModeToggle = !disabled && !subKey && filter && index < selectedOptions.length - 1;
            return (
              <Fragment key={option.value}>
                {chip}
                {showModeToggle && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => helpers?.handleSwitchLocalMode?.(filter)}
                    onKeyDown={onActivationKey(() => helpers?.handleSwitchLocalMode?.(filter))}
                    style={{
                      display: 'inline-block',
                      cursor: 'pointer',
                      userSelect: 'none',
                      margin: '0 4px',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontFamily: 'Consolas, monaco, monospace',
                      backgroundColor: theme.palette.action?.disabled,
                    }}
                  >
                    {t_i18n((filter.mode ?? 'or').toUpperCase())}
                  </span>
                )}
              </Fragment>
            );
          })}
        </ComboboxChips>
        <ComboboxInput
          {...comboboxInputProps}
          id={inputId}
          aria-label={label ? t_i18n(label) : undefined}
          onFocus={handleInputFocus}
          onChange={handleNativeInputChange}
        />
        {inputValue && (
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                variant="default"
                priority="tertiary"
                size="sm"
                className="rounded-full text-default-secondary"
                onClick={handleClearInputValue}
                aria-label={t_i18n('Clear search')}
                icon={<HighlightOffOutlined fontSize="small" />}
              />
            </TooltipTrigger>
            <TooltipContent>{t_i18n('Clear search')}</TooltipContent>
          </Tooltip>
        )}
        {isStixObjectTypes.includes(searchKey)
          ? (
              <SearchScopeElement
                name={searchKey}
                searchScope={searchScope}
                setSearchScope={setSearchScope}
                availableRelationFilterTypes={availableRelationFilterTypes}
                additionalEntityTypes={filterKey === 'regardingOf' && subKey === 'id' ? ['External-Reference'] : undefined}
              />
            )
          : (
              <>
                {!disabled && <ComboboxClear aria-label={t_i18n('Clear all')} />}
                <ComboboxTrigger aria-label={t_i18n('Open')} />
              </>
            )}
      </ComboboxField>
      <ComboboxContent>
        <ComboboxEmpty>{t_i18n('No available options')}</ComboboxEmpty>
        {optionNodes}
      </ComboboxContent>
    </Combobox>
  );
};

export default FilterEntityAutocomplete;
