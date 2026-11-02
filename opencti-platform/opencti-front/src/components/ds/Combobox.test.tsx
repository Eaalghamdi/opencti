import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox, ComboboxField, ComboboxInput, ComboboxTrigger, ComboboxClear, ComboboxContent, ComboboxItem } from './Combobox';

type Fruit = { label: string; value: string };

const options: Fruit[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
];

function Example({
  onValueChange,
  onInputChange,
  loading,
  disabled,
  value = null,
  items = options,
}: {
  onValueChange?: (value: Fruit | null) => void;
  onInputChange?: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
  value?: Fruit | null;
  items?: Fruit[];
}) {
  return (
    <Combobox
      value={value}
      onValueChange={onValueChange ?? (() => {})}
      options={items}
      getOptionLabel={(o) => o.label}
      onInputChange={onInputChange}
      loading={loading}
      disabled={disabled}
    >
      <ComboboxField>
        <ComboboxInput aria-label="Fruit" />
        <ComboboxClear aria-label="Clear" />
        <ComboboxTrigger />
      </ComboboxField>
      <ComboboxContent>
        {items.map((o) => (
          <ComboboxItem key={o.value} value={o}>{o.label}</ComboboxItem>
        ))}
      </ComboboxContent>
    </Combobox>
  );
}

describe('Combobox', () => {
  it('shows matching options as the user types, and hides non-matching ones', async () => {
    render(<Example />);
    await userEvent.type(screen.getByRole('combobox'), 'ban');
    expect(await screen.findByText('Banana')).toBeInTheDocument();
    // A real filtering assertion, not a tautology: Apple must disappear too.
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
  });

  it('calls onValueChange with the selected option', async () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('combobox'));
    const option = await screen.findByText('Banana');
    await userEvent.click(option);
    expect(onValueChange).toHaveBeenCalledWith(options[1]);
  });

  it('ComboboxClear resets the input text and selected value when clicked', async () => {
    function ControlledExample() {
      const [value, setValue] = useState<Fruit | null>(null);
      return (
        <Combobox value={value} onValueChange={setValue} options={options} getOptionLabel={(o) => o.label}>
          <ComboboxField>
            <ComboboxInput aria-label="Fruit" />
            <ComboboxClear aria-label="Clear" />
            <ComboboxTrigger />
          </ComboboxField>
          <ComboboxContent>
            {options.map((o) => (
              <ComboboxItem key={o.value} value={o}>{o.label}</ComboboxItem>
            ))}
          </ComboboxContent>
        </Combobox>
      );
    }
    render(<ControlledExample />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByText('Banana'));
    expect(screen.getByRole('combobox')).toHaveValue('Banana');

    await userEvent.click(await screen.findByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('shows the Spinner while loading is true, even before the popup opens', () => {
    render(<Example loading items={[]} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not show the Spinner when loading is false', () => {
    render(<Example loading={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('ComboboxStatus announces "Loading..." to screen readers once the popup is open while loading', async () => {
    render(<Example loading />);
    await userEvent.click(screen.getByRole('combobox'));
    const status = await screen.findByText('Loading...');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('ComboboxStatus has no announcement when not loading', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('combobox'));
    await screen.findByText('Banana');
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('calls onInputChange as the user types, letting the caller own async filtering', async () => {
    const onInputChange = vi.fn();
    render(<Example onInputChange={onInputChange} />);
    await userEvent.type(screen.getByRole('combobox'), 'ban');
    expect(onInputChange).toHaveBeenLastCalledWith('ban');
  });

  it('trusts options as-is (no extra local filtering) once onInputChange is supplied', async () => {
    // When the caller owns the async fetch (onInputChange is given), Combobox must not
    // additionally apply its own substring filter against the already-server-filtered
    // `options` it was handed - otherwise a caller's remote search (e.g. fuzzy matching
    // unrelated to the literal query text) could be silently hidden again by this component.
    const onInputChange = vi.fn();
    render(<Example onInputChange={onInputChange} items={[{ label: 'Zephyr', value: 'z' }]} />);
    await userEvent.type(screen.getByRole('combobox'), 'ban');
    expect(await screen.findByText('Zephyr')).toBeInTheDocument();
  });

  it('is disabled when disabled is true', () => {
    render(<Example disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  // Regression guard: Combobox must only ever render the `options` prop it was most
  // recently given - no internal caching/memoizing of a prior options array. This
  // simulates the caller correctly having resolved a race between two async fetches
  // (an earlier "banana" search and a later "cherry" search): by the time Combobox is
  // given `cherry`, it must never show a frame still reflecting the stale `banana` set.
  it('ignores a stale async response: always renders whatever options it is currently given', async () => {
    const banana: Fruit[] = [{ label: 'Banana', value: 'banana' }];
    const cherry: Fruit[] = [{ label: 'Cherry', value: 'cherry' }];
    const onInputChange = vi.fn();

    function Harness({ items }: { items: Fruit[] }) {
      return (
        <Combobox
          value={null}
          onValueChange={() => {}}
          options={items}
          getOptionLabel={(o) => o.label}
          onInputChange={onInputChange}
        >
          <ComboboxField>
            <ComboboxInput aria-label="Fruit" />
            <ComboboxTrigger />
          </ComboboxField>
          <ComboboxContent>
            {items.map((o) => (
              <ComboboxItem key={o.value} value={o}>{o.label}</ComboboxItem>
            ))}
          </ComboboxContent>
        </Combobox>
      );
    }

    const { rerender } = render(<Harness items={banana} />);
    await userEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByText('Banana')).toBeInTheDocument();

    // The caller's second (faster-resolving, later-triggered) fetch wins and re-renders
    // with its own result set - Combobox must immediately reflect it, not a cached prior one.
    rerender(<Harness items={cherry} />);
    expect(screen.getByText('Cherry')).toBeInTheDocument();
    expect(screen.queryByText('Banana')).not.toBeInTheDocument();
  });
});
