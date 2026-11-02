# Combobox Design-System Primitive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local `ds/Combobox` primitive (single- and multi-select, async search, custom chip rendering) and migrate the three files that still render MUI's `Autocomplete` directly onto it, so the HUMAIN-DS library covers OpenCTI's async entity-search pattern.

**Architecture:** `ds/Combobox.tsx` wraps `@base-ui-components/react`'s `Combobox` parts (`Root`/`Trigger`/`Input`/`Popup`/`List`/`Item`/`Chips`/`Chip`/`ChipRemove`/`Clear`/`Status`/`Group`/`Empty`) the same way Phase 1's `Select.tsx`/`Dialog.tsx` wrapped their Base UI counterparts — compound sub-components, `render` merge-props for interactive triggers, `ds/tokens.css` variables for styling. A chip-slot render prop supports a requirement Filigran's own design system was found to lack (locked/non-removable chips and custom content between chips — see Task 3). `AutocompleteField.tsx`'s external prop type (`AutocompleteFieldProps`) stays byte-identical so its three downstream consumers need no changes.

**Tech Stack:** `@base-ui-components/react@1.0.0-rc.0` `Combobox` parts (already installed, confirmed present at `node_modules/@base-ui-components/react/combobox`), existing `ds/tokens.css` + `ds/lib/cn` + `ds/lib/useThemeMode`, Vitest + `@testing-library/react` + `@testing-library/user-event`.

**Spec:** `docs/superpowers/specs/2026-11-01-mui-to-local-ds-migration-design.md` (see the "Re-confirmed at the start of Phase 2" entry under "Decided" — this plan deliberately diverges from `fds-migration/`'s own Combobox track; see "Scope note" below).

## Scope note (read before starting)

Recon (2026-11-02) found OpenCTI's async-entity-search surface is **already mostly migrated** to `@filigran/design-system`'s own `Combobox` — 5 files use it today (`AutocompleteFreeSoloField.jsx`, `ConfidenceOverrideField.tsx`, `CsvMapperRepresentationForm.tsx`, `JsonMapperRepresentationForm.tsx`, `EntitySelectWithTypes.tsx`). Only **three files** still render MUI's `Autocomplete` directly, and both of the non-trivial ones carry a code comment naming a specific, already-logged capability gap in `fds-migration/LIBRARY-FEEDBACK.md`:

- `components/AutocompleteField.tsx` — the shared Formik-bound wrapper (consumed by `ComboboxField.tsx`, `StixCoreObjectsField.tsx`, `OpenVocabField.tsx`, none of which need to change if this wrapper's external API is preserved).
- `components/filters/fields/FilterEntityAutocomplete.tsx` — carries `// fds:keep-mui gap #66 — ComboboxChips has no per-chip slot: no between-chips AND/OR toggle, no locked chip`.
- `private/components/settings/sub_types/custom_views/CustomViewPreviewEntitySelector.tsx` — carries `// FDS-WORKAROUND #43: kept on MUI Autocomplete — the library field exposes no per-state tint`.

This plan converts all three to the local `ds/Combobox` instead of waiting on upstream FDS fixes, per the project's standing decision to keep building the local HUMAIN-DS library (see spec). This is a deliberate, accepted divergence from `fds-migration/`'s own gap-tracking process for these two specific sites — not a bug, but worth the next person's awareness: these files exit the FDS gap list without the gaps themselves being resolved upstream.

**Out of scope for this plan:** the `DataTable` restyle (87 files, ~3,000 lines, GraphQL-pagination-coupled) is a separate, much larger, mostly-independent subsystem per the spec's roadmap — it gets its own plan.

## Global Constraints

- RTL-ready: logical CSS properties only, no hardcoded `left`/`right` (spec Goal 7) — the one documented exception from Phase 1 (Tabs' indicator position, which is itself physical-pixel-measured) does not apply here.
- Reuse `ds/tokens.css` variables; never invent a new color/spacing/radius value (spec Constraints).
- No direct HUMAIN DS visual reference exists for Combobox (confirmed: not in the spec's "HUMAIN DS reference inventory", Policy Guardrail never used one) — approximate using `ds/Select`'s established visual language as the closest sibling primitive (same popup/listbox/item styling), not guessed independently.
- Base UI's `Combobox` capability must be verified by reading the installed build at `node_modules/@base-ui-components/react/combobox/*` before an approach is locked in for a task's implementation — not assumed from memory of Base UI's docs, which may lag the installed `1.0.0-rc.0`.
- `AutocompleteField.tsx`'s exported `AutocompleteFieldProps` type and default export signature must not change — this is what keeps its three downstream consumers at zero changes. A task that cannot preserve this must say so explicitly in its report rather than silently widen scope to those consumers.
- No change to the existing `formik-mui`/`useField` integration behavior (value sync, `setFieldTouched`, error/touched display rules).

## Review Focus

- Multi-select Formik values that arrive as `null`/`undefined`/`''` instead of an array (today's `AutocompleteField.tsx` has an explicit guard for this — the migrated version must keep behaving the same way): Task 5 adds a test for this exact case.
- The "create new option" (`openCreate`) affordance in `AutocompleteField.tsx` must still render and still call the passed callback, not just "the dropdown still opens": Task 5 adds a test clicking it.
- `FilterEntityAutocomplete.tsx`'s locked chip (disabled selection that cannot be removed, with an explanatory tooltip) and its between-chip AND/OR mode toggle must render in the correct position among chips, not just "somewhere": Task 6 adds a test asserting chip order and the toggle's placement between two specific chips.
- Async search results arriving after the user has already changed or cleared the input (stale-response race) must not overwrite a newer input value: Task 2 adds a test that resolves an earlier async call after a later one.
- Keyboard users must be able to Tab past a multi-select's chip-remove buttons without one extra stop per chip (today's `deleteTabIndex={-1}` requirement from `AutocompleteField.tsx`'s `Tag` rendering) and must be able to reach and activate the clear-all control without a mouse: Task 3 and Task 6 each add a keyboard-navigation test for their own chip rendering.

---

### Task 1: `ds/Spinner` primitive

**Files:**
- Create: `opencti-platform/opencti-front/src/components/ds/Spinner.tsx`
- Test: `opencti-platform/opencti-front/src/components/ds/Spinner.test.tsx`
- Modify: `opencti-platform/opencti-front/src/components/ds/index.ts` — export `Spinner`

**Interfaces:**
- Produces: `Spinner({ size?: 'sm' | 'md', className?: string })` — a small inline loading indicator, `role="status"` with an `aria-label` (default `"Loading"`, overridable via a `label?: string` prop), used by Task 2's async-loading state.

- [ ] **Step 1: Write the failing test**

```tsx
// Spinner.test.tsx
it('renders a status role with a loading label', () => {
  render(<Spinner />);
  expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
});

it('accepts a custom label', () => {
  render(<Spinner label="Searching" />);
  expect(screen.getByRole('status', { name: 'Searching' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/.bin/vitest run src/components/ds/Spinner.test.tsx`
Expected: FAIL — `Spinner` not defined / module not found.

- [ ] **Step 3: Implement `Spinner` in `ds/Spinner.tsx`**

A small SVG or CSS-animated ring (reuse the rotation keyframe approach already used by OpenCTI's current MUI `CircularProgress` usages for visual familiarity — check one such usage for the animation shape, not the implementation). Size variants map to fixed pixel dimensions via `ds/tokens.css` spacing variables, not literals. `className` merges via `cn()` from `ds/lib/cn`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node node_modules/.bin/vitest run src/components/ds/Spinner.test.tsx`
Expected: PASS

- [ ] **Step 5: Export from `ds/index.ts` and commit**

```bash
git add src/components/ds/Spinner.tsx src/components/ds/Spinner.test.tsx src/components/ds/index.ts
git commit -m "feat(ds): add Spinner primitive"
```

---

### Task 2: `ds/Combobox` — single-select core

**Files:**
- Create: `opencti-platform/opencti-front/src/components/ds/Combobox.tsx`
- Test: `opencti-platform/opencti-front/src/components/ds/Combobox.test.tsx`
- Modify: `opencti-platform/opencti-front/src/components/ds/index.ts` — export `Combobox` and its sub-parts

**Interfaces:**
- Consumes: `Spinner` from Task 1 (`ds/Spinner`); `cn` from `ds/lib/cn`; `useThemeMode` from `ds/lib/useThemeMode` (same pattern as `ds/Select.tsx`).
- Produces (compound component, mirroring `ds/Select.tsx`'s composition style):
  - `Combobox` — root, props: `value`, `onValueChange`, `options: T[]`, `getOptionLabel: (option: T) => string`, `isOptionEqualToValue?: (a: T, b: T) => boolean`, `onInputChange?: (value: string) => void`, `loading?: boolean`, `disabled?: boolean`, `multiple?: boolean` (default `false` — Task 3 adds `true` support), `children: React.ReactNode`.
  - `ComboboxLabel`, `ComboboxField` (the bordered input container — equivalent to `AutocompleteField`'s `TextField` box), `ComboboxInput`, `ComboboxTrigger`, `ComboboxClear`, `ComboboxContent` (listbox popup), `ComboboxItem`, `ComboboxEmpty`, `ComboboxHelperText` — names match `@filigran/design-system`'s own Combobox part names (confirmed via `AutocompleteFreeSoloField.jsx`) so the two systems read the same way side by side in the diff, even though they are separate implementations.
- Before writing this task's implementation, read `node_modules/@base-ui-components/react/combobox/index.parts.d.ts` and the relevant per-part `.d.ts` files to confirm Base UI's actual prop names for filtering (`items`/`filter` or similar), open/close state (`onOpenChangeComplete` — Phase 1's `ds/Select.tsx` already hit a Base UI quirk here: `Select.Root` never resets an internal `forceMount` flag, and the popup must gate its mount on `onOpenChangeComplete(false)`, not raw `onOpenChange`; check whether `Combobox.Root` has the same quirk before assuming it does or doesn't), and async-loading affordances, rather than guessing from the part/file names alone.

- [ ] **Step 1: Write the failing tests**

```tsx
// Combobox.test.tsx
it('shows matching options as the user types', async () => {
  const options = [{ label: 'Apple', value: 'apple' }, { label: 'Banana', value: 'banana' }];
  render(
    <Combobox value={null} onValueChange={() => {}} options={options} getOptionLabel={(o) => o.label}>
      <ComboboxField><ComboboxInput /><ComboboxTrigger /></ComboboxField>
      <ComboboxContent>{options.map((o) => <ComboboxItem key={o.value} value={o}>{o.label}</ComboboxItem>)}</ComboboxContent>
    </Combobox>,
  );
  await userEvent.type(screen.getByRole('combobox'), 'ban');
  expect(await screen.findByText('Banana')).toBeInTheDocument();
});

it('calls onValueChange with the selected option', async () => { /* click an option, assert the callback arg */ });

it('shows the Spinner while loading is true', () => {
  render(<Combobox value={null} onValueChange={() => {}} options={[]} getOptionLabel={() => ''} loading>...</Combobox>);
  expect(screen.getByRole('status')).toBeInTheDocument();
});

it('ignores a stale async response that resolves after a newer one', async () => {
  // Simulate onInputChange firing twice with out-of-order resolving promises upstream;
  // assert the rendered options reflect the LATEST input, not the first-to-resolve one.
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/.bin/vitest run src/components/ds/Combobox.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the single-select `Combobox` compound component**

Wrap Base UI's `Combobox.Root`/`Trigger`/`Input`/`Popup`/`List`/`Item`/`Empty`/`Status` per the confirmed API from the pre-reading above. Style via `ds/tokens.css` variables, following `ds/Select.tsx`'s popup/listbox/item visual pattern (Global Constraints). The stale-response race (last review-focus item) is the caller's responsibility in general (the caller owns the async fetch), but `Combobox` itself must only ever render the `options` prop it was most recently given — no internal caching/memoizing of a prior options array — so a parent that correctly sequences its own fetch never sees a flash of stale options from this component itself.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/.bin/vitest run src/components/ds/Combobox.test.tsx`
Expected: PASS

- [ ] **Step 5: Export from `ds/index.ts` and commit**

```bash
git add src/components/ds/Combobox.tsx src/components/ds/Combobox.test.tsx src/components/ds/index.ts
git commit -m "feat(ds): add Combobox primitive (single-select)"
```

---

### Task 3: `ds/Combobox` — multi-select, chips, and the custom chip slot

**Files:**
- Modify: `opencti-platform/opencti-front/src/components/ds/Combobox.tsx`
- Modify: `opencti-platform/opencti-front/src/components/ds/Combobox.test.tsx`

**Interfaces:**
- Consumes: Task 2's `Combobox` root and parts.
- Produces: `multiple={true}` support on `Combobox` (value becomes `T[]`); `ComboboxChips` (chip row container — a plain composable wrapper that renders whatever children it is given, in order, with no internal per-item mapping of its own); `ComboboxChip` — accepts `disabled?: boolean` (renders a non-removable, visually distinct "locked" chip — this is the capability `fds:keep-mui gap #66` found missing in `@filigran/design-system`'s own `ComboboxChips`) and `children: React.ReactNode` as **its own displayed content** (e.g. a label string or a nested `Tag`), the same children-as-content convention as `ds/Badge`; `ComboboxChipRemove`; `ComboboxClear` (clears the whole multi-select, distinct from a single chip's own remove). Because `ComboboxChips` is a plain container, a caller can interleave arbitrary sibling JSX (e.g. a mode-toggle element) directly between `ComboboxChip` instances with no special prop required — this is what Task 6 relies on for `FilterEntityAutocomplete.tsx`'s between-chip AND/OR toggle, and it must work as ordinary React composition, not through a dedicated API on `ComboboxChip` itself.

- [ ] **Step 1: Write the failing tests**

```tsx
it('renders one chip per selected value in a multi-select', () => { /* ... */ });
it('removes a chip when its remove control is activated', async () => { /* ... */ });
it('renders a disabled chip with no remove control when ComboboxChip has disabled', () => { /* ... */ });
it('renders an arbitrary sibling element interleaved between two ComboboxChip instances in document order', () => {
  // ComboboxChips renders exactly the children it is given, in order — assert a plain
  // sibling element placed between two ComboboxChip children lands between them in the DOM,
  // with no special prop needed on ComboboxChip itself
});
it('each chip remove control is reachable by keyboard but is not an extra Tab stop ahead of the next field', async () => {
  // Tab from the input through N chips' remove controls without N extra stops beyond what's expected
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/.bin/vitest run src/components/ds/Combobox.test.tsx`
Expected: FAIL on the four new cases.

- [ ] **Step 3: Implement multi-select, `ComboboxChips`/`ComboboxChip`/`ComboboxChipRemove`/`ComboboxClear`**

Use Base UI's `Combobox.Chips`/`Chip`/`ChipRemove` parts as the base (confirmed present in the installed build at `node_modules/@base-ui-components/react/combobox/{chips,chip,chip-remove}`); read their `.d.ts` files for the exact prop/render-prop shape before assuming one. The locked-chip and between-chip-children requirements are what `ComboboxChip` must add on top of Base UI's own part — check whether Base UI's `Chip` part already exposes a `disabled`/non-interactive mode before building one from scratch.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/.bin/vitest run src/components/ds/Combobox.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ds/Combobox.tsx src/components/ds/Combobox.test.tsx
git commit -m "feat(ds): add Combobox multi-select, chips, and locked/custom chip support"
```

---

### Task 4: Migrate `CustomViewPreviewEntitySelector.tsx`

**Files:**
- Modify: `opencti-platform/opencti-front/src/private/components/settings/sub_types/custom_views/CustomViewPreviewEntitySelector.tsx`
- Test: `opencti-platform/opencti-front/src/private/components/settings/sub_types/custom_views/CustomViewPreviewEntitySelector.test.tsx` (create if it doesn't already exist)

**Interfaces:**
- Consumes: `Combobox`, `ComboboxField`, `ComboboxInput`, `ComboboxContent`, `ComboboxItem` from `ds/` (Task 2).

- [ ] **Step 1: Write the failing test** (if no test file exists yet for this component)

```tsx
it('searches on focus and renders matching entities with their icon', async () => {
  // mock fetchQuery to resolve a fixed set of stixCoreObjects
  // assert the rendered option shows both the ItemIcon and the label
});
it('calls onPreviewEntityChange with the selected entity id, and with null when cleared', async () => { /* ... */ });
it('applies the in-preview tint styling once a value is selected', () => {
  // the FDS-WORKAROUND #43 behavior (orange tint via IN_PREVIEW_SX_PROPS today) must survive
  // the migration in some form — assert the selected state is visually distinguishable
  // (e.g. a data-attribute or class ds/Combobox exposes for this), not the exact MUI sx keys
});
```

- [ ] **Step 2: Run test to verify it fails (or passes on old MUI implementation first, to confirm the test is meaningful)**

Run: `node node_modules/.bin/vitest run src/private/components/settings/sub_types/custom_views/CustomViewPreviewEntitySelector.test.tsx`

- [ ] **Step 3: Replace the MUI `Autocomplete`/`TextField` with `ds/Combobox`**

Single-select (`multiple` omitted/false). Preserve: search-on-focus and search-on-input-change calling `fetchOptions`, the custom option row (icon + label via `ItemIcon`), `isOptionEqualToValue` by `.value`, and the "in preview" tinted state when a value is selected — express the tint via a `ds/tokens.css` variable keyed off a state the new `Combobox` exposes (e.g. a `data-selected` attribute on `ComboboxField`), not a carried-over MUI `sx` object. Remove the `// FDS-WORKAROUND #43` comment and its `IN_PREVIEW_SX_PROPS` constant — the workaround no longer applies once this file is off MUI entirely.

- [ ] **Step 4: Run test to verify it passes**

Run: `node node_modules/.bin/vitest run src/private/components/settings/sub_types/custom_views/CustomViewPreviewEntitySelector.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/private/components/settings/sub_types/custom_views/CustomViewPreviewEntitySelector.tsx src/private/components/settings/sub_types/custom_views/CustomViewPreviewEntitySelector.test.tsx
git commit -m "refactor(custom-views): migrate CustomViewPreviewEntitySelector off MUI Autocomplete to ds/Combobox"
```

---

### Task 5: Migrate `AutocompleteField.tsx`

**Files:**
- Modify: `opencti-platform/opencti-front/src/components/AutocompleteField.tsx`
- Test: `opencti-platform/opencti-front/src/components/AutocompleteField.test.tsx` (create if it doesn't already exist)

**Interfaces:**
- Consumes: `Combobox` and all sub-parts from `ds/` (Tasks 2-3), including the Task 1 `Spinner` (surfaced automatically via `Combobox`'s own `loading` handling — `AutocompleteField` does not need to import `Spinner` directly).
- Produces: the exact same `AutocompleteFieldProps<M, Value, DC, FSolo>` type and default-export signature as today — this is the hard constraint from Global Constraints. `ComboboxField.tsx`, `StixCoreObjectsField.tsx`, `OpenVocabField.tsx` must need zero code changes.

- [ ] **Step 1: Write the failing tests** (if no test file exists yet)

```tsx
it('single-select: renders the field inside a Formik form and calls setFieldValue on selection', async () => { /* ... */ });
it('multi-select: a null/undefined/empty-string Formik value does not crash, and renders as empty', () => {
  // the exact regression this file already guards against today (fieldProps.multiple && !Array.isArray)
});
it('multi-select: selected values render as Tag chips via the default renderValue, each with deleteTabIndex -1', () => { /* ... */ });
it('shows the openCreate button when the prop is provided, and calls it on click', async () => { /* ... */ });
it('shows the field error and helper text per existing meta.error/touched/submitCount rules', () => { /* ... */ });
```

- [ ] **Step 2: Run tests to verify they fail (or pass against the current MUI implementation first)**

Run: `node node_modules/.bin/vitest run src/components/AutocompleteField.test.tsx`

- [ ] **Step 3: Replace the internal MUI `Autocomplete`/`TextField` with `ds/Combobox`, keeping `AutocompleteFieldProps` unchanged**

Keep `fieldToAutocomplete` from `formik-mui` wiring the Formik field state the same way; adapt its output to `Combobox`'s prop names at the call site inside this file only. Keep `defaultRenderValue`'s `Tag`-based chip rendering: each selected value renders as `<ComboboxChip key={value}><Tag .../></ComboboxChip>` (Task 3's `ComboboxChip`, with the `Tag` as its own displayed content), including the `deleteTabIndex={-1}` behavior. Keep `openCreate`'s `IconButton` + `Add` icon affordance positioned the same way.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/.bin/vitest run src/components/AutocompleteField.test.tsx`
Expected: PASS

- [ ] **Step 5: Confirm zero changes needed in downstream consumers**

Run: `git diff --stat -- src/components/ComboboxField.tsx src/components/StixCoreObjectsField.tsx src/private/components/common/form/OpenVocabField.tsx`
Expected: empty (no output) — if any of these three files need a change to keep working, that is a plan defect: stop and record a ruling rather than silently editing them.

- [ ] **Step 6: Commit**

```bash
git add src/components/AutocompleteField.tsx src/components/AutocompleteField.test.tsx
git commit -m "refactor(forms): migrate AutocompleteField off MUI Autocomplete to ds/Combobox"
```

---

### Task 6: Migrate `FilterEntityAutocomplete.tsx`

**Files:**
- Modify: `opencti-platform/opencti-front/src/components/filters/fields/FilterEntityAutocomplete.tsx`
- Test: `opencti-platform/opencti-front/src/components/filters/fields/FilterEntityAutocomplete.test.tsx` (create if it doesn't already exist)

**Interfaces:**
- Consumes: `Combobox` and all sub-parts from `ds/` (Tasks 2-3), specifically the locked-chip and between-chip-children capability from Task 3.

- [ ] **Step 1: Write the failing tests** (if no test file exists yet)

```tsx
it('renders selected options as chips in selection order', () => { /* ... */ });
it('renders a locked (non-removable) chip with an explanatory tooltip when disabled and exactly one value is locked', () => {
  // the isLockedValue / "Cannot be removed..." tooltip case
});
it('renders the AND/OR mode toggle between two chips, not before the first or after the last', () => {
  // the showModeToggle condition: not disabled, no subKey, filter present, index < length - 1
});
it('clicking the mode toggle calls helpers.handleSwitchLocalMode with the filter', async () => { /* ... */ });
it('typing in the input triggers a new search and updates inputValue', async () => { /* ... */ });
it('the clear-search button clears inputValue without re-triggering a search for the old text', async () => {
  // the isRefocusingAfterClearRef guard
});
it('renders the SearchScopeElement adornment for stix-object-type filter keys', () => { /* ... */ });
```

- [ ] **Step 2: Run tests to verify they fail (or pass against the current MUI implementation first)**

Run: `node node_modules/.bin/vitest run src/components/filters/fields/FilterEntityAutocomplete.test.tsx`

- [ ] **Step 3: Replace the MUI `Autocomplete`/`TextField` with `ds/Combobox`, preserving all documented behaviors**

Multi-select, using `ComboboxChip`'s `disabled` for the locked chip (wrapped in `Tooltip`/`TooltipContent`/`TooltipTrigger`, already imported from `@filigran/design-system` in this file today — keep using FDS's `Tooltip`/`Chip`/`IconButton` for parts this migration does not need to touch, per the plan's scope: only the `Autocomplete`/`TextField` pairing moves) and, for the mode toggle, a plain sibling element rendered directly inside `ComboboxChips` between the relevant `ComboboxChip` instances (ordinary composition, per Task 3 — no special prop on `ComboboxChip` itself). Preserve `useFilterEntityOptions`'s search/value wiring, `handleAutocompleteChange`'s reason-based branching (translate MUI's `AutocompleteChangeReason`/`AutocompleteInputChangeReason` enum values to whatever `Combobox` exposes — read `node_modules/@base-ui-components/react/combobox/root/*` for its actual change-reason shape before assuming parity), the `isRefocusingAfterClearRef` guard, and the `SearchScopeElement` endAdornment behavior. Remove the `// fds:keep-mui gap #66` comments and the `sx` height-parity hack — height parity is the default once this is on the same `ds/` system as everything beside it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/.bin/vitest run src/components/filters/fields/FilterEntityAutocomplete.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/filters/fields/FilterEntityAutocomplete.tsx src/components/filters/fields/FilterEntityAutocomplete.test.tsx
git commit -m "refactor(filters): migrate FilterEntityAutocomplete off MUI Autocomplete to ds/Combobox"
```
