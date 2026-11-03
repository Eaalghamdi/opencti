import React from 'react';
import { screen } from '@testing-library/react';
import { Field, Form, Formik, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { describe, expect, it, vi } from 'vitest';
import AutocompleteField from './AutocompleteField';
import testRender from '../utils/tests/test-render';
import { FieldOption } from '../utils/field';

const options: FieldOption[] = [
  { label: 'Alpha', value: 'alpha' },
  { label: 'Beta', value: 'beta' },
];

describe('Component: AutocompleteField', () => {
  it('single-select: renders the field inside a Formik form and calls setFieldValue on selection', async () => {
    const { user } = testRender(
      <Formik initialValues={{ entity: null }} onSubmit={() => {}}>
        <Form>
          <Field
            component={AutocompleteField}
            name="entity"
            options={options}
            textfieldprops={{ label: 'Entity' }}
          />
        </Form>
      </Formik>,
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.click(await screen.findByText('Beta'));

    // Round-trips through Formik's own state (setFieldValue -> field.value ->
    // fieldProps.value -> Combobox's value), proving the wiring end to end
    // rather than mocking setFieldValue directly.
    expect(input).toHaveValue('Beta');
  });

  it('multi-select: a null/undefined/empty-string Formik value does not crash, and renders as empty', () => {
    for (const initial of [null, undefined, '']) {
      const { unmount } = testRender(
        <Formik initialValues={{ entities: initial }} onSubmit={() => {}}>
          <Form>
            <Field component={AutocompleteField} name="entities" multiple options={options} />
          </Form>
        </Formik>,
      );

      expect(screen.getByRole('combobox')).toHaveValue('');
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
      expect(screen.queryByText('Beta')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('multi-select: selected values render as Tag chips via the default renderValue, each with deleteTabIndex -1', async () => {
    const { user } = testRender(
      <Formik initialValues={{ entities: [options[0], options[1]] }} onSubmit={() => {}}>
        <Form>
          <Field component={AutocompleteField} name="entities" multiple options={options} />
        </Form>
      </Formik>,
    );

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();

    const removeAlpha = screen.getByRole('button', { name: 'Remove Alpha' });
    const removeBeta = screen.getByRole('button', { name: 'Remove Beta' });
    // A chip row inside a select field is one Tab stop: each delete button must
    // not add an extra one of its own.
    expect(removeAlpha).toHaveAttribute('tabindex', '-1');
    expect(removeBeta).toHaveAttribute('tabindex', '-1');

    await user.click(removeAlpha);
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('multi-select: disables each chip\'s own delete button when the field itself is disabled', async () => {
    const { user } = testRender(
      <Formik initialValues={{ entities: [options[0], options[1]] }} onSubmit={() => {}}>
        <Form>
          <Field component={AutocompleteField} name="entities" multiple disabled options={options} />
        </Form>
      </Formik>,
    );

    const removeAlpha = screen.getByRole('button', { name: 'Remove Alpha' });
    const removeBeta = screen.getByRole('button', { name: 'Remove Beta' });
    expect(removeAlpha).toBeDisabled();
    expect(removeBeta).toBeDisabled();

    // Not just a disabled attribute: clicking it must not actually remove the chip
    // (a native `disabled` button does not fire click handlers at all).
    await user.click(removeAlpha);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('shows the openCreate button when the prop is provided, and calls it on click', async () => {
    const openCreate = vi.fn();
    const { user } = testRender(
      <Formik initialValues={{ entity: null }} onSubmit={() => {}}>
        <Form>
          <Field component={AutocompleteField} name="entity" options={options} openCreate={openCreate} />
        </Form>
      </Formik>,
    );

    const addButton = screen.getByRole('button', { name: 'Add' });
    await user.click(addButton);
    expect(openCreate).toHaveBeenCalledTimes(1);
  });

  it('shows the field error and helper text per existing meta.error/touched/submitCount rules', async () => {
    const schema = Yup.object().shape({
      entity: Yup.mixed().required('Required field'),
    });

    const { user } = testRender(
      <Formik initialValues={{ entity: null }} validationSchema={schema} onSubmit={() => {}}>
        <Form>
          <Field
            component={AutocompleteField}
            name="entity"
            options={options}
            textfieldprops={{ helperText: 'Pick one' }}
          />
          <button type="submit">Submit</button>
        </Form>
      </Formik>,
    );

    // Before any interaction: the default helper text shows, no error yet.
    expect(screen.getByText('Pick one')).toBeInTheDocument();
    expect(screen.queryByText('Required field')).not.toBeInTheDocument();

    // submitCount > 0 surfaces the error even though the field was never touched.
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Required field')).toBeInTheDocument();
    expect(screen.queryByText('Pick one')).not.toBeInTheDocument();
  });

  it('marks the error state on the input (aria-invalid, aria-describedby) and the helper text', async () => {
    const schema = Yup.object().shape({
      entity: Yup.mixed().required('Required field'),
    });
    const { user } = testRender(
      <Formik initialValues={{ entity: null }} validationSchema={schema} onSubmit={() => {}}>
        <Form noValidate>
          <Field
            component={AutocompleteField}
            name="entity"
            options={options}
            textfieldprops={{ label: 'Entity', helperText: 'Pick one' }}
          />
          <button type="submit">Submit</button>
        </Form>
      </Formik>,
    );

    const input = screen.getByRole('combobox', { name: 'Entity' });
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAccessibleDescription('Pick one');

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await screen.findByText('Required field');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Required field');
    expect(screen.getByText('Required field')).toHaveAttribute('data-invalid');
  });

  it('required: sets the native required attribute and shows a required marker on the label', () => {
    testRender(
      <Formik initialValues={{ entity: null }} onSubmit={() => {}}>
        <Form>
          <Field component={AutocompleteField} name="entity" options={options} required textfieldprops={{ label: 'Entity' }} />
        </Form>
      </Formik>,
    );
    const input = screen.getByRole('combobox', { name: 'Entity' });
    expect(input).toHaveAttribute('required');
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('required multi-select: drops the native constraint once a value is selected, since the search input stays empty', () => {
    testRender(
      <Formik initialValues={{ entities: [options[0]] }} onSubmit={() => {}}>
        <Form>
          <Field component={AutocompleteField} name="entities" multiple options={options} required textfieldprops={{ label: 'Entities' }} />
        </Form>
      </Formik>,
    );
    const input = screen.getByRole('combobox', { name: 'Entities' });
    // (jest-dom's toBeRequired also counts aria-required, hence the attribute check.)
    expect(input).not.toHaveAttribute('required');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('applies style/className to the whole field, so the label stays attached to its box', () => {
    testRender(
      <Formik initialValues={{ entity: null }} onSubmit={() => {}}>
        <Form>
          <Field
            component={AutocompleteField}
            name="entity"
            options={options}
            style={{ marginTop: 20 }}
            className="custom-field"
            textfieldprops={{ label: 'Entity' }}
          />
        </Form>
      </Formik>,
    );
    const label = screen.getByText('Entity');
    const styled = label.closest('.custom-field') as HTMLElement;
    expect(styled).not.toBeNull();
    expect(styled.style.marginTop).toBe('20px');
    // The margin sits outside the label + box pair, never between them: the bordered box
    // (the input's own container) carries none of it.
    const input = screen.getByRole('combobox');
    expect(styled).toContainElement(input);
    expect((input.parentElement as HTMLElement).style.marginTop).toBe('');
  });

  it('reflects a later setFieldValue when the Formik key starts out missing (undefined)', async () => {
    function SetLater() {
      const { setFieldValue } = useFormikContext<Record<string, unknown>>();
      return <button type="button" onClick={() => setFieldValue('entity', options[1])}>Set Beta</button>;
    }
    const { user } = testRender(
      <Formik initialValues={{} as Record<string, unknown>} onSubmit={() => {}}>
        <Form>
          <Field component={AutocompleteField} name="entity" options={options} />
          <SetLater />
        </Form>
      </Formik>,
    );
    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Set Beta' }));
    expect(input).toHaveValue('Beta');
  });

  it('renders groupBy runs as ARIA groups named by their header', async () => {
    const grouped: FieldOption[] = [
      { label: 'Alpha', value: 'alpha', type: 'Malware' } as FieldOption,
      { label: 'Beta', value: 'beta', type: 'Malware' } as FieldOption,
      { label: 'Gamma', value: 'gamma', type: 'Tool' } as FieldOption,
    ];
    const { user } = testRender(
      <Formik initialValues={{ entity: null }} onSubmit={() => {}}>
        <Form>
          <Field
            component={AutocompleteField}
            name="entity"
            options={grouped}
            groupBy={(option: FieldOption & { type: string }) => option.type}
          />
        </Form>
      </Formik>,
    );
    await user.click(screen.getByRole('combobox'));
    const malware = await screen.findByRole('group', { name: 'Malware' });
    const tool = screen.getByRole('group', { name: 'Tool' });
    expect(malware).toContainElement(screen.getByRole('option', { name: 'Alpha' }));
    expect(malware).toContainElement(screen.getByRole('option', { name: 'Beta' }));
    expect(tool).toContainElement(screen.getByRole('option', { name: 'Gamma' }));
  });
});

// Regression guard for StixCoreObjectsField's search-to-create flow: it remembers what
// the user searched for ONLY on an `'input'` reason (searchStixCoreObjects), and that term
// pre-fills the name of the entity created through its synthetic "Create X" option. The
// input text also changes programmatically when an option is picked - Base UI fills it
// with the picked label (single-select) or empties it on close (multi-select) - and
// neither of those may be reported as `'input'`.
describe('Component: AutocompleteField onInputChange reasons (search-to-create)', () => {
  const createOption: FieldOption = { label: 'Create Malware', value: 'create-new' };

  function SearchToCreateHarness({ multiple = false }: { multiple?: boolean }) {
    const [searchTerm, setSearchTerm] = React.useState('');
    // Same branching as StixCoreObjectsField's searchStixCoreObjects.
    const searchStixCoreObjects = (_event: React.SyntheticEvent | null, newInputValue?: string, reason?: string) => {
      if (reason === 'input' || reason === undefined) {
        setSearchTerm(newInputValue ?? '');
      }
    };
    return (
      <Formik initialValues={{ entity: multiple ? [] : null }} onSubmit={() => {}}>
        <Form>
          <Field
            component={AutocompleteField}
            name="entity"
            multiple={multiple}
            options={[...options, createOption]}
            onInputChange={searchStixCoreObjects}
            textfieldprops={{ label: 'Entity', onFocus: searchStixCoreObjects }}
          />
          <output data-testid="search-term">{searchTerm}</output>
        </Form>
      </Formik>
    );
  }

  it('single-select: picking the create option keeps the typed search term, not the option label', async () => {
    const { user } = testRender(<SearchToCreateHarness />);
    await user.type(screen.getByRole('combobox'), 'mal');
    expect(screen.getByTestId('search-term')).toHaveTextContent('mal');

    await user.click(await screen.findByText('Create Malware'));
    expect(screen.getByTestId('search-term')).toHaveTextContent(/^mal$/);
  });

  it('multi-select: picking the create option keeps the typed search term, not an emptied input', async () => {
    const { user } = testRender(<SearchToCreateHarness multiple />);
    await user.type(screen.getByRole('combobox'), 'mal');
    await user.click(await screen.findByText('Create Malware'));
    expect(screen.getByTestId('search-term')).toHaveTextContent(/^mal$/);
  });

  it('typing still reports an input reason', async () => {
    const onInputChange = vi.fn();
    const { user } = testRender(
      <Formik initialValues={{ entity: null }} onSubmit={() => {}}>
        <Form>
          <Field component={AutocompleteField} name="entity" options={options} onInputChange={onInputChange} />
        </Form>
      </Formik>,
    );
    await user.type(screen.getByRole('combobox'), 'al');
    expect(onInputChange).toHaveBeenLastCalledWith(undefined, 'al', 'input');
  });
});
