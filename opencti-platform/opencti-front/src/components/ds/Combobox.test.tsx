import { Fragment, useState, type ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox, ComboboxField, ComboboxInput, ComboboxTrigger, ComboboxClear, ComboboxContent, ComboboxItem, ComboboxChips, ComboboxChip, ComboboxChipRemove } from './Combobox';

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

describe('Combobox multi-select', () => {
  function MultiExample({
    initialValue = [],
    lockedValues = [],
    betweenChips,
  }: {
    initialValue?: Fruit[];
    lockedValues?: Fruit[];
    betweenChips?: ReactNode;
  }) {
    const [value, setValue] = useState<Fruit[]>(initialValue);
    const isLocked = (fruit: Fruit) => lockedValues.some((f) => f.value === fruit.value);
    return (
      <Combobox multiple value={value} onValueChange={setValue} options={options} getOptionLabel={(o) => o.label}>
        <ComboboxField>
          <ComboboxChips>
            {value.map((fruit, i) => (
              <Fragment key={fruit.value}>
                <ComboboxChip disabled={isLocked(fruit)}>
                  {fruit.label}
                  <ComboboxChipRemove aria-label={`Remove ${fruit.label}`} />
                </ComboboxChip>
                {i === 0 && betweenChips}
              </Fragment>
            ))}
          </ComboboxChips>
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

  it('renders one chip per selected value in a multi-select', () => {
    render(<MultiExample initialValue={options} />);
    expect(screen.getAllByText('Apple')).toHaveLength(1);
    expect(screen.getAllByText('Banana')).toHaveLength(1);
  });

  it('selecting an item in the popup adds it to the array rather than replacing the selection', async () => {
    render(<MultiExample initialValue={[options[0]]} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByText('Banana'));
    // Multi-select keeps the popup open after a selection, so close it before
    // asserting - otherwise "Banana" matches both its (still open) list item and
    // its new chip.
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('removes a chip when its remove control is activated', async () => {
    render(<MultiExample initialValue={options} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Apple' }));
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('renders a disabled chip with no remove control when ComboboxChip has disabled', () => {
    render(<MultiExample initialValue={options} lockedValues={[options[0]]} />);
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Apple' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Banana' })).toBeInTheDocument();
  });

  it('renders an arbitrary sibling element interleaved between two ComboboxChip instances in document order', () => {
    render(
      <MultiExample
        initialValue={options}
        betweenChips={<span data-testid="mode-toggle">AND</span>}
      />,
    );
    const chips = screen.getAllByText(/Apple|Banana/);
    const toggle = screen.getByTestId('mode-toggle');
    const allNodes = [chips[0], toggle, chips[1]];
    // Document order: Apple chip, then the interleaved sibling, then Banana chip -
    // asserts ComboboxChips rendered exactly the children it was given, in order,
    // with no special prop needed on ComboboxChip for this.
    for (let i = 0; i < allNodes.length - 1; i += 1) {
      expect(allNodes[i].compareDocumentPosition(allNodes[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('each chip remove control is reachable by keyboard but is not an extra Tab stop ahead of the next field', async () => {
    // Base UI's own `ComboboxClear`/`ComboboxTrigger` are themselves `tabIndex={-1}`
    // (confirmed by reading ComboboxClear.js/ComboboxTrigger.js) - the whole
    // field/chip row is designed as a single Tab stop (the input), with every
    // auxiliary control, including chip removes, reachable only via roving
    // arrow-key navigation or a direct click/focus, never via Tab. A sibling field
    // after the whole Combobox proves a Tab from the input skips straight past it,
    // however many chips are present.
    render(
      <>
        <MultiExample initialValue={options} />
        <input aria-label="Next field" />
      </>,
    );
    const input = screen.getByRole('combobox');
    const nextField = screen.getByRole('textbox', { name: 'Next field' });
    const removeApple = screen.getByRole('button', { name: 'Remove Apple' });
    const removeBanana = screen.getByRole('button', { name: 'Remove Banana' });

    // Not an extra Tab stop: tabbing once from the input (with two chips present)
    // lands on the next real field, never on a chip's remove control.
    input.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(nextField);
    expect(document.activeElement).not.toBe(removeApple);
    expect(document.activeElement).not.toBe(removeBanana);

    // Still reachable by keyboard: a remove control can receive focus (e.g. via the
    // roving arrow-key navigation among chips) and Enter activates it.
    removeApple.focus();
    expect(document.activeElement).toBe(removeApple);
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });
});
