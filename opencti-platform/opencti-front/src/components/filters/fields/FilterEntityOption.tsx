import { FilterOptionValue } from '@components/common/lists/FilterAutocomplete';
import { Checkbox, Tooltip, TooltipContent, TooltipTrigger } from '@filigran/design-system';
import { FunctionComponent } from 'react';
import ItemIcon from '../../ItemIcon';

interface FilterEntityOptionProps {
  option: FilterOptionValue;
  checked: boolean;
  disabled: boolean;
}

/**
 * The CONTENT of one row of the entity autocomplete: checkbox, entity icon and truncated
 * label, the whole row also being its own tooltip trigger for the labels the ellipsis cuts.
 *
 * `ComboboxItem` (ds/Combobox) owns the row's actual interactive element and its ARIA
 * (role="option", aria-selected, aria-disabled, the disabled/pointer-events behavior) - this
 * component only supplies what goes inside it, the same "library owns the row, caller supplies
 * content" split AutocompleteField.tsx's own renderOptionContent uses for its MUI-style
 * renderOption adapter. Its `ComboboxItem` (in FilterEntityAutocomplete) therefore takes
 * `aria-label={option.label}` - the row's name, not "<label> <label>" from this checkbox's
 * own label plus the text - and `hideIndicator`, this checkbox being the row's selected cue.
 */
const FilterEntityOption: FunctionComponent<FilterEntityOptionProps> = ({
  option,
  checked,
  disabled,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            width: '100%',
            pointerEvents: disabled ? 'none' : undefined,
          }}
        >
          <Checkbox checked={checked} disabled={disabled} aria-label={option.label} />
          <ItemIcon type={option.type} color={option.color} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {option.label}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{option.label}</TooltipContent>
    </Tooltip>
  );
};

export default FilterEntityOption;
