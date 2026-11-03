import { createRef, Fragment, useState, type ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Combobox,
  ComboboxField,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxClear,
  ComboboxContent,
  ComboboxItem,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxHelperText,
  ComboboxLabel,
} from './Combobox';

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
  onInputChange?: (value: string, reason: string) => void;
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
    expect(onInputChange).toHaveBeenLastCalledWith('ban', 'input-change');
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

function SingleHarness({
  value,
  onValueChange = () => {},
  onInputChange,
  children,
}: {
  value: Fruit | null;
  onValueChange?: (value: Fruit | null) => void;
  onInputChange?: (value: string, reason: string) => void;
  children?: ReactNode;
}) {
  return (
    <Combobox value={value} onValueChange={onValueChange} options={options} getOptionLabel={(o) => o.label} onInputChange={onInputChange}>
      <ComboboxField>
        <ComboboxInput aria-label="Fruit" />
        <ComboboxTrigger aria-label="Open" />
      </ComboboxField>
      <ComboboxContent>
        {children ?? options.map((o) => (
          <ComboboxItem key={o.value} value={o}>{o.label}</ComboboxItem>
        ))}
      </ComboboxContent>
    </Combobox>
  );
}

function ControlledSingle({ initial = null, onInputChange, onValueChange }: {
  initial?: Fruit | null;
  onInputChange?: (value: string, reason: string) => void;
  onValueChange?: (value: Fruit | null) => void;
}) {
  const [value, setValue] = useState<Fruit | null>(initial);
  return (
    <SingleHarness
      value={value}
      onInputChange={onInputChange}
      onValueChange={(next) => {
        onValueChange?.(next);
        setValue(next);
      }}
    />
  );
}

describe('Combobox: typing, labelling, error state', () => {
  it('ComboboxInput forwards its ref to the real <input>, and accepts native input attributes', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Combobox value={null} onValueChange={() => {}} options={options} getOptionLabel={(o) => o.label}>
        <ComboboxField>
          <ComboboxInput ref={ref} aria-label="Fruit" name="fruit" />
        </ComboboxField>
      </Combobox>,
    );
    expect(ref.current).toBe(screen.getByRole('combobox'));
    expect(ref.current).toHaveAttribute('name', 'fruit');
  });

  it('ComboboxLabel accepts htmlFor and renders an aria-hidden required marker', () => {
    render(
      <Combobox value={null} onValueChange={() => {}} options={options} getOptionLabel={(o) => o.label}>
        <ComboboxLabel htmlFor="fruit-input" required>Fruit</ComboboxLabel>
        <ComboboxField>
          <ComboboxInput id="fruit-input" required />
        </ComboboxField>
      </Combobox>,
    );
    expect(screen.getByRole('combobox', { name: 'Fruit' })).toBeRequired();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('ComboboxField and ComboboxHelperText carry a distinct error state', () => {
    render(
      <Combobox value={null} onValueChange={() => {}} options={options} getOptionLabel={(o) => o.label}>
        <ComboboxField error data-testid="field">
          <ComboboxInput aria-label="Fruit" aria-invalid aria-describedby="fruit-error" />
        </ComboboxField>
        <ComboboxHelperText id="fruit-error" error>Required field</ComboboxHelperText>
        <ComboboxHelperText>Just a hint</ComboboxHelperText>
      </Combobox>,
    );
    const field = screen.getByTestId('field');
    expect(field).toHaveAttribute('data-invalid');
    expect(field.className).toContain('data-[invalid]:border-[var(--destructive)]');
    expect(screen.getByRole('combobox')).toHaveAccessibleDescription('Required field');
    expect(screen.getByText('Required field').className).toContain('text-[var(--destructive)]');
    expect(screen.getByText('Just a hint').className).toContain('text-[var(--muted-foreground)]');
    expect(screen.getByText('Just a hint')).not.toHaveAttribute('data-invalid');
  });

  it('passes the real input-change reason through: typing is input-change, a single-select pick is item-press', async () => {
    const onInputChange = vi.fn();
    render(<ControlledSingle onInputChange={onInputChange} />);
    await userEvent.type(screen.getByRole('combobox'), 'ba');
    expect(onInputChange).toHaveBeenLastCalledWith('ba', 'input-change');
    onInputChange.mockClear();
    await userEvent.click(await screen.findByText('Banana'));
    expect(onInputChange).toHaveBeenCalledWith('Banana', 'item-press');
    expect(onInputChange).not.toHaveBeenCalledWith('Banana', 'input-change');
  });

  it('stays controlled when value starts out undefined: later value updates are reflected', () => {
    const { rerender } = render(<SingleHarness value={undefined as unknown as Fruit | null} />);
    expect(screen.getByRole('combobox')).toHaveValue('');
    rerender(<SingleHarness value={options[1]} />);
    expect(screen.getByRole('combobox')).toHaveValue('Banana');
    rerender(<SingleHarness value={null} />);
    expect(screen.getByRole('combobox')).toHaveValue('');
  });
});

describe('Combobox: popup', () => {
  it('stacks the popup above MUI modal hosts, and bounds it to a scrolling list matching the field width', async () => {
    render(<SingleHarness value={null} />);
    await userEvent.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    // jsdom has no real stacking contexts: this asserts the overlay level is applied
    // to the portaled positioner, not how a browser composites it.
    expect(listbox.closest('[class*="z-[var(--fds-z-overlay,1400)]"]')).not.toBeNull();
    const popup = listbox.parentElement as HTMLElement;
    expect(popup.className).toContain('max-h-[min(var(--available-height),40vh)]');
    expect(popup.className).toContain('overflow-y-auto');
    expect(popup.className).toContain('w-[var(--anchor-width)]');
  });

  it('renders grouped options as ARIA groups named by their ComboboxGroupLabel', async () => {
    render(
      <SingleHarness value={null}>
        <ComboboxGroup>
          <ComboboxGroupLabel>Red</ComboboxGroupLabel>
          <ComboboxItem value={options[0]}>{options[0].label}</ComboboxItem>
        </ComboboxGroup>
        <ComboboxGroup>
          <ComboboxGroupLabel>Yellow</ComboboxGroupLabel>
          <ComboboxItem value={options[1]}>{options[1].label}</ComboboxItem>
        </ComboboxGroup>
      </SingleHarness>,
    );
    await userEvent.click(screen.getByRole('combobox'));
    const red = await screen.findByRole('group', { name: 'Red' });
    const yellow = screen.getByRole('group', { name: 'Yellow' });
    expect(red).toContainElement(screen.getByRole('option', { name: 'Apple' }));
    expect(yellow).toContainElement(screen.getByRole('option', { name: 'Banana' }));
  });

  it('ComboboxItem accepts an aria-label and can hide its own selected indicator', async () => {
    render(
      <SingleHarness value={options[0]}>
        <ComboboxItem value={options[0]} aria-label="Apple" hideIndicator>
          <input type="checkbox" aria-label="Apple" checked readOnly />
          Apple
        </ComboboxItem>
        <ComboboxItem value={options[1]}>Banana</ComboboxItem>
      </SingleHarness>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const apple = await screen.findByRole('option', { name: 'Apple' });
    expect(apple).toHaveAttribute('aria-selected', 'true');
    // Selected, but no check-mark indicator: the row's own checkbox is the cue.
    expect(apple.querySelector('svg')).toBeNull();
  });

  it('shows the check-mark indicator on a selected item by default', async () => {
    render(<SingleHarness value={options[0]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const apple = await screen.findByRole('option', { name: 'Apple' });
    expect(apple.querySelector('svg')).not.toBeNull();
  });
});

describe('Combobox: keyboard clear-all', () => {
  // Base UI's own ComboboxInput.js: Escape while the popup is closed clears the input
  // and resets the selection to `null`/`[]` (reason `escape-key`). The mouse-only
  // `ComboboxClear` stays out of the Tab order; this is its keyboard counterpart.
  it('Escape with the popup closed clears a single-select', async () => {
    const onValueChange = vi.fn();
    render(<ControlledSingle initial={options[1]} onValueChange={onValueChange} />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('Banana');
    input.focus();
    await userEvent.keyboard('{Escape}');
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(input).toHaveValue('');
  });

  it('Escape with the popup closed clears every chip of a multi-select', async () => {
    function ControlledMulti() {
      const [value, setValue] = useState<Fruit[]>(options);
      return (
        <Combobox multiple value={value} onValueChange={setValue} options={options} getOptionLabel={(o) => o.label}>
          <ComboboxField>
            <ComboboxChips>
              {value.map((fruit) => (
                <ComboboxChip key={fruit.value}>{fruit.label}</ComboboxChip>
              ))}
            </ComboboxChips>
            <ComboboxInput aria-label="Fruit" />
          </ComboboxField>
          <ComboboxContent>
            {options.map((o) => (
              <ComboboxItem key={o.value} value={o}>{o.label}</ComboboxItem>
            ))}
          </ComboboxContent>
        </Combobox>
      );
    }
    render(<ControlledMulti />);
    expect(screen.getByText('Apple')).toBeInTheDocument();
    screen.getByRole('combobox').focus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
    expect(screen.queryByText('Banana')).not.toBeInTheDocument();
  });

  it('Escape first closes an open popup, and only a second Escape clears the selection', async () => {
    render(<ControlledSingle initial={options[1]} />);
    const input = screen.getByRole('combobox');
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    input.focus();
    await userEvent.keyboard('{Escape}');
    expect(input).toHaveValue('Banana');
    await userEvent.keyboard('{Escape}');
    expect(input).toHaveValue('');
  });
});
