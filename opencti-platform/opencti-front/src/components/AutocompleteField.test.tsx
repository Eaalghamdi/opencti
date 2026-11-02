import React from 'react';
import { screen } from '@testing-library/react';
import { Field, Form, Formik } from 'formik';
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
});
