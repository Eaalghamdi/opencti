import React, { ReactNode, useCallback, useId } from 'react';
import IconButton from '@common/button/IconButton';
import { Add } from '@mui/icons-material';
import { AutocompleteProps, AutocompleteRenderValue, AutocompleteRenderValueGetItemProps, AutocompleteValue, TextFieldProps } from '@mui/material';
import { FieldProps, useField } from 'formik';
import { FieldOption } from '../utils/field';
import { truncate } from '../utils/String';
import { useFormatter } from './i18n';
import { isNilField } from '../utils/utils';
import { fieldToAutocomplete } from 'formik-mui';
import Tag from '@common/tag/Tag';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxField,
  ComboboxHelperText,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxTrigger,
} from './ds/Combobox';

type Bool = boolean | undefined;
type PossibleValue = FieldOption | string;

export type AutocompleteFieldProps<
  M extends Bool = true,
  Value extends PossibleValue = FieldOption,
  DC extends Bool = boolean,
  FSolo extends Bool = false,
> = Omit<AutocompleteProps<Value, M, DC, FSolo>, 'onChange' | 'onBlur' | 'onFocus' | 'renderInput'>
  & FieldProps<Value>
  & {
    optionLength?: number;
    required?: boolean;
    endAdornment?: ReactNode;
    textfieldprops?: TextFieldProps;
    preserveCase?: boolean;
    onFocus?: (name: string) => void;
    onChange?: (name: string, value: AutocompleteValue<Value, M, DC, FSolo>) => void;
    onInternalChange?: (name: string, value: AutocompleteValue<Value, M, DC, FSolo>) => void;
    openCreate?: () => void;
  };

// `ds/Combobox`'s own generics (`Multiple extends boolean = false`) need a boolean
// LITERAL to resolve `value: Multiple extends true ? T[] : T | null` - this field's
// own `M` is an unresolved `boolean | undefined` (fixed by none of the three real
// callers, which all leave `multiple` inferred at the call site), so that
// conditional type can never resolve to the right branch generically here. The
// runtime behavior is unaffected - `fieldProps.multiple` is read and guarded exactly
// as before - this only erases the compile-time shape at this one internal call site.
type ErasedComboboxProps<Value> = {
  value: unknown;
  onValueChange: (value: unknown) => void;
  options: Value[];
  getOptionLabel: (option: Value) => string;
  isOptionEqualToValue?: (a: Value, b: Value) => boolean;
  onInputChange?: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  children: ReactNode;
};
const ErasedCombobox = Combobox as unknown as <Value>(props: ErasedComboboxProps<Value>) => React.JSX.Element;

const AutocompleteField = <
  M extends Bool = true,
  Value extends PossibleValue = FieldOption,
  DC extends Bool = boolean,
  FSolo extends Bool = false,
>({
  optionLength = 40,
  required = false,
  onChange,
  onFocus,
  onInternalChange,
  openCreate,
  ...muiProps
}: AutocompleteFieldProps<M, Value, DC, FSolo>) => {
  type MuiProps = AutocompleteProps<Value, M, DC, FSolo>;
  // The MUI-style `(props, option, state, ownerState) => <li>...</li>` signature,
  // kept because the public prop type is unchanged - see `renderOptionContent` below
  // for how it is adapted onto `ComboboxItem`.
  type RenderOptionFn = NonNullable<MuiProps['renderOption']>;
  const {
    form: { setFieldValue, setFieldTouched, submitCount },
    field: { name },
    noOptionsText,
    renderOption,
    isOptionEqualToValue,
    textfieldprops,
    preserveCase,
    getOptionLabel,
    endAdornment,
    disabled,
    renderValue,
    groupBy,
  } = muiProps;

  const [, meta] = useField(name);
  const { t_i18n } = useFormatter();
  const inputId = useId();

  const internalOnChange = useCallback<NonNullable<MuiProps['onChange']>>((_, value) => {
    if (onInternalChange) {
      onInternalChange(name, value);
    } else {
      setFieldValue(name, value);
      onChange?.(name, value);
    }
  }, [setFieldValue, name, onChange, onInternalChange]);

  const internalOnFocus = useCallback(() => {
    onFocus?.(name);
  }, [onFocus, name]);

  const internalOnBlur = useCallback(() => {
    setFieldTouched(name, true);
  }, [setFieldTouched, name]);

  const defaultOptionToValue = (option: Value, value: Value | string) => {
    const optionVal = typeof option === 'object' ? option.value : option;
    const valueVal = typeof value === 'object' ? value.value : value;
    return optionVal === valueVal;
  };

  const defaultGetOptionLabel: MuiProps['getOptionLabel'] = (option) => {
    return typeof option === 'object'
      ? truncate(option.label, optionLength)
      : truncate(option, optionLength);
  };

  const getOptionData = (option: Value | string) => {
    return typeof option === 'object' && option !== null
      ? { label: option.label, value: option.value, color: option.color }
      : { label: String(option), value: String(option), color: undefined };
  };

  const defaultRenderValue = (
    values: AutocompleteRenderValue<Value, true, FSolo>,
    getItemProps: AutocompleteRenderValueGetItemProps<true>,
  ) => (
    values.map((option, index) => {
      const { label, value, color } = getOptionData(option);
      return (
        <ComboboxChip key={value}>
          <Tag
            {...getItemProps({ index })}
            // a chip row inside a select field is ONE tab stop; the delete
            // buttons must not each add another
            deleteTabIndex={-1}
            labelTextTransform={preserveCase ? 'none' : 'capitalize'}
            label={label}
            color={color}
          />
        </ComboboxChip>
      );
    })
  );

  const helperText = textfieldprops?.helperText;
  const showError = !isNilField(meta.error) && (meta.touched || submitCount > 0);
  const fieldProps = fieldToAutocomplete({
    ...muiProps,
    // Never invoked: `ds/Combobox` replaces MUI's own `renderInput`-based TextField
    // entirely, but `fieldToAutocomplete`'s own parameter type still requires a
    // `renderInput` (it comes from the full `AutocompleteProps`, from which this
    // file's own type deliberately omits it) - this satisfies that unrelated
    // requirement without being called.
    renderInput: () => null,
  });

  // When multiple is true, a Formik field may be initialized as null/undefined/empty
  // string rather than an array, which would crash both the old MUI Autocomplete and
  // `ds/Combobox` alike (both expect `value: Value[]` once `multiple` is set).
  if (fieldProps.multiple && !Array.isArray(fieldProps.value)) {
    fieldProps.value = (fieldProps.value != null && fieldProps.value !== '' ? [fieldProps.value] : []) as unknown as typeof fieldProps.value;
  }

  const multiple = !!fieldProps.multiple;
  const multiValues = (multiple ? fieldProps.value : []) as Value[];

  const removeValueAt = useCallback((index: number) => {
    const current = (fieldProps.value as Value[]) ?? [];
    const next = current.filter((_, i) => i !== index);
    internalOnChange(
      undefined as unknown as React.SyntheticEvent,
      next as unknown as AutocompleteValue<Value, M, DC, FSolo>,
      'removeOption',
    );
  }, [fieldProps.value, internalOnChange]);

  const getChipItemProps = useCallback<AutocompleteRenderValueGetItemProps<true>>(({ index }) => ({
    key: index,
    className: '',
    disabled: false,
    'data-item-index': index,
    tabIndex: -1,
    onDelete: () => removeValueAt(index),
  }), [removeValueAt]);

  const handleValueChange = useCallback((next: unknown) => {
    internalOnChange(
      undefined as unknown as React.SyntheticEvent,
      next as AutocompleteValue<Value, M, DC, FSolo>,
      'selectOption',
    );
  }, [internalOnChange]);

  const handleInputChange = useCallback((value: string) => {
    fieldProps.onInputChange?.(undefined as unknown as React.SyntheticEvent, value, 'input');
  }, [fieldProps.onInputChange]);

  const handleInputFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    internalOnFocus();
    textfieldprops?.onFocus?.(event);
  }, [internalOnFocus, textfieldprops]);

  // `ComboboxLabelProps`/`ComboboxInputProps` (in `ds/Combobox.tsx`, not touched by
  // this task) are typed as plain `HTMLAttributes`, which omits `htmlFor`/`name` -
  // those belong to the more specific `LabelHTMLAttributes`/`InputHTMLAttributes`.
  // Spreading a separately, correctly-typed object sidesteps the resulting
  // excess-property check while still passing the attribute through to the real DOM
  // element at runtime.
  const comboboxLabelProps = { htmlFor: inputId } as React.LabelHTMLAttributes<HTMLLabelElement>;
  const comboboxInputProps = {
    id: inputId,
    name,
    'aria-required': required || undefined,
    onFocus: handleInputFocus,
    onBlur: internalOnBlur,
  } as React.InputHTMLAttributes<HTMLInputElement>;

  // The row CONTENT only - the MUI-style `renderOption` this file's public type
  // still carries returns a whole `<li {...props}>content</li>`; `ComboboxItem`
  // (not the caller) owns the actual interactive element and its ARIA, so only the
  // returned element's children are kept, matching the same "library owns the row,
  // caller supplies content" split already used by `ComboboxField.tsx`.
  const renderOptionContent = useCallback((option: Value, index: number): ReactNode => {
    if (!renderOption) {
      return (getOptionLabel || defaultGetOptionLabel)(option);
    }
    const element = (renderOption as RenderOptionFn)(
      { key: index } as React.HTMLAttributes<HTMLLIElement> & { key: React.Key },
      option,
      { inputValue: '', index, selected: false },
      {} as unknown as Parameters<RenderOptionFn>[3],
    );
    if (React.isValidElement<{ children?: ReactNode }>(element)) {
      return element.props.children ?? element;
    }
    return element;
  }, [renderOption, getOptionLabel]);

  const options = fieldProps.options ?? [];
  let lastGroup: string | undefined;
  const optionNodes: ReactNode[] = [];
  options.forEach((option: Value, index: number) => {
    if (groupBy) {
      const group = groupBy(option);
      if (group !== lastGroup) {
        lastGroup = group;
        optionNodes.push(
          <div key={`group-${group}-${index}`} className="px-2 py-1.5 text-xs font-medium text-[var(--muted-foreground)]">
            {group}
          </div>,
        );
      }
    }
    const { value: optionValue } = getOptionData(option);
    optionNodes.push(
      <ComboboxItem key={optionValue} value={option} disabled={fieldProps.getOptionDisabled?.(option)}>
        {renderOptionContent(option, index)}
      </ComboboxItem>,
    );
  });

  return (
    <div style={{ position: 'relative' }}>
      <ErasedCombobox<Value>
        value={fieldProps.value}
        onValueChange={handleValueChange}
        options={options as Value[]}
        getOptionLabel={(getOptionLabel || defaultGetOptionLabel) as (option: Value) => string}
        isOptionEqualToValue={(isOptionEqualToValue ?? defaultOptionToValue) as (a: Value, b: Value) => boolean}
        onInputChange={fieldProps.onInputChange ? handleInputChange : undefined}
        loading={fieldProps.loading}
        disabled={fieldProps.disabled}
        multiple={multiple}
      >
        {textfieldprops?.label && (
          <ComboboxLabel {...comboboxLabelProps}>{textfieldprops.label}</ComboboxLabel>
        )}
        <ComboboxField style={fieldProps.style} className={fieldProps.className}>
          {multiple && (
            <ComboboxChips>
              {(renderValue ?? (defaultRenderValue as MuiProps['renderValue']))?.(
                multiValues as unknown as Parameters<NonNullable<MuiProps['renderValue']>>[0],
                getChipItemProps as unknown as Parameters<NonNullable<MuiProps['renderValue']>>[1],
                {} as unknown as Parameters<NonNullable<MuiProps['renderValue']>>[2],
              )}
            </ComboboxChips>
          )}
          <ComboboxInput {...comboboxInputProps} />
          {endAdornment ?? (
            <>
              {!fieldProps.disableClearable && <ComboboxClear aria-label={t_i18n('Clear')} />}
              <ComboboxTrigger aria-label={t_i18n('Open')} />
            </>
          )}
        </ComboboxField>
        <ComboboxContent>
          {noOptionsText ? <ComboboxEmpty>{noOptionsText}</ComboboxEmpty> : null}
          {optionNodes}
        </ComboboxContent>
        {(showError || helperText) && (
          <ComboboxHelperText>{showError ? meta.error : helperText}</ComboboxHelperText>
        )}
      </ErasedCombobox>

      {openCreate && (
        <IconButton
          disabled={disabled}
          onClick={() => openCreate()}
          sx={{
            position: 'absolute',
            bottom: showError ? 25 : 4,
            right: 25,
          }}
          title={t_i18n('Add')}
          aria-label={t_i18n('Add')}
        >
          <Add fontSize="small" />
        </IconButton>
      )}
    </div>
  );
};

export default AutocompleteField;
