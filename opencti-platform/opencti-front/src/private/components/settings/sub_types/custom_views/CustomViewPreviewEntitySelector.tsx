import React, { FunctionComponent, useId, useState } from 'react';
import { graphql } from 'react-relay';
import { Combobox, ComboboxClear, ComboboxContent, ComboboxEmpty, ComboboxField, ComboboxInput, ComboboxItem, ComboboxLabel, ComboboxTrigger } from '../../../../../components/ds';
import ItemIcon from '../../../../../components/ItemIcon';
import { useFormatter } from '../../../../../components/i18n';
import { fetchQuery } from '../../../../../relay/environment';
import { CustomViewPreviewEntitySelectorQuery$data } from './__generated__/CustomViewPreviewEntitySelectorQuery.graphql';

const customViewPreviewEntitySelectorQuery = graphql`
  query CustomViewPreviewEntitySelectorQuery($search: String, $type: String!) {
    stixCoreObjects(search: $search, types: [$type], first: 100) {
      edges {
        node {
          id
          entity_type
          representative {
            main
          }
        }
      }
    }
  }
`;

const fetchOptions = async (type: string, search: string = '') => {
  const data = await fetchQuery(customViewPreviewEntitySelectorQuery, {
    search,
    type: type,
  }).toPromise();
  const typedData = data as CustomViewPreviewEntitySelectorQuery$data;
  const options = (typedData.stixCoreObjects?.edges ?? []).map((edge) => edge.node)
    .map((node) => ({
      label: node.representative.main,
      value: node.id,
      entityType: node.entity_type,
    }));
  return options;
};

interface PreviewEntityOption {
  label: string;
  value: string;
  entityType: string;
}

interface CustomViewPreviewEntitySelectorProps {
  type: string;
  onPreviewEntityChange: (id: string | null) => void;
}

const CustomViewPreviewEntitySelector: FunctionComponent<CustomViewPreviewEntitySelectorProps> = ({
  type,
  onPreviewEntityChange,
}) => {
  const { t_i18n } = useFormatter();
  const inputId = useId();
  const [stixCoreObjects, setStixCoreObjects] = useState<PreviewEntityOption[]>([]);
  const [value, setValue] = useState<PreviewEntityOption | null>(null);

  const searchStixCoreObjects = (search: string = '') => {
    fetchOptions(type, search).then((options) => {
      setStixCoreObjects([...options]);
    });
  };

  const handleValueChange = (next: PreviewEntityOption | null) => {
    setValue(next);
    onPreviewEntityChange(next ? next.value : null);
  };

  // The field is "in preview" for as long as a substituted entity is selected -
  // this is a product state signal on the field shell (see
  // fds-migration/MIGRATION-DECISIONS.md#field-state-tint), expressed here via a
  // data attribute this component owns plus the --ds-tint-warning token, now that
  // the field is off MUI entirely rather than carried over as an `sx` object.
  const isInPreview = value !== null;

  return (
    <div style={{ width: '100%', maxWidth: '500px' }}>
      <ComboboxLabel
        htmlFor={inputId}
        style={isInPreview ? { color: 'var(--ds-tint-warning)' } : undefined}
      >
        {t_i18n('Preview with current entity set to...')}
      </ComboboxLabel>
      <Combobox
        value={value}
        onValueChange={handleValueChange}
        options={stixCoreObjects}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, other) => option.value === other.value}
        onInputChange={searchStixCoreObjects}
      >
        <ComboboxField
          data-selected={isInPreview ? 'true' : undefined}
          style={isInPreview ? { borderColor: 'var(--ds-tint-warning)' } : undefined}
        >
          <ComboboxInput id={inputId} onFocus={() => searchStixCoreObjects('')} />
          <ComboboxClear aria-label={t_i18n('Clear')} />
          <ComboboxTrigger />
        </ComboboxField>
        <ComboboxContent>
          <ComboboxEmpty>{t_i18n('No available options')}</ComboboxEmpty>
          {stixCoreObjects.map((option) => (
            <ComboboxItem key={option.value} value={option}>
              <ItemIcon type={option.entityType} />
              {option.label}
            </ComboboxItem>
          ))}
        </ComboboxContent>
      </Combobox>
    </div>
  );
};

export default CustomViewPreviewEntitySelector;
