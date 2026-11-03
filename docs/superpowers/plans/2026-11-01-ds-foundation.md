# Design System Foundation (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a new, local, HUMAIN-DS-shaped component library inside `opencti-front` —
Tailwind v4, a token layer, and the ~15 primitives HUMAIN DS already has in production use
(Button, Input, Textarea, Select, Dialog, Sheet, Sidebar, Tabs, Card, Badge, Switch,
Tooltip, Popover, Kbd) — without touching any of the 1,115 existing MUI-consuming files.
The app keeps running unmodified on MUI throughout; this phase is purely additive.

**Architecture:** Tailwind v4 styles the new components; theming is CSS custom properties.
Rather than building a second dynamic-theming engine, the new tokens **alias onto
OpenCTI's existing, already-dynamic Filigran design-system tokens**
(`src/components/fds-tokens.generated.ts`, `src/utils/hooks/useFdsThemeScope.ts`,
`src/static/css/custom-theme-tokens.css`) — the mechanism that already turns an admin's
`theme_primary`/`theme_background`/etc. (set via Settings → Themes) into live CSS custom
properties on `document.documentElement`, today, for MUI. Aliasing onto it means an
admin's custom theme drives the new components automatically, with zero new plumbing.
Interactive primitives (Dialog, Popover, Select, Tabs, Sheet, Tooltip) wrap **Base UI**
(`@base-ui-components/react`) for accessible behavior (focus management, portals,
keyboard nav, ARIA) — chosen because HUMAIN DS's own naming (`DialogPopup`,
`SelectPopup`, `PopoverPopup`) matches Base UI's `*.Popup` convention exactly, not
Radix's `*.Content` convention, so it's the closest real match to what's being
approximated, not an arbitrary pick.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Base UI
(`@base-ui-components/react`), `class-variance-authority`, `clsx`, `tailwind-merge`,
`lucide-react`, Vitest + `@testing-library/react` (already in the repo).

**Spec:** `docs/superpowers/specs/2026-11-01-mui-to-local-ds-migration-design.md`

## Global Constraints

- Nothing in `opencti-platform/opencti-front/src/**` outside the new `src/components/ds/`
  folder and the two CSS-import lines in `src/front.tsx` (Task 1) may be modified. No
  existing MUI, theme, or route file changes in this phase (spec Goal 5, "keep the app
  usable throughout").
- No dependency on the real `@humain-foundation/ui` package (spec Non-goals — no registry
  access).
- Every new primitive is directionality-aware: use logical CSS properties
  (`ps-*`/`pe-*`/`ms-*`/`me-*`, `start-*`/`end-*`, never `left`/`right`/`pl`/`pr`/`ml`/`mr`
  Tailwind utilities) (spec Goal 7).
- Theming must stay dynamic/GraphQL-driven at runtime, not static (spec Goal 6) — satisfied
  by aliasing onto the existing Filigran tokens described above, not a parallel system.
- Component composition follows the Trigger/Popup/sub-part pattern observed in HUMAIN DS
  (spec: "HUMAIN DS reference inventory"), not single mega-components.
- `Button` props: `variant` (`primary`/`secondary`/`destructive`), `appearance`
  (`solid` default/`outline`/`ghost`), `size` (`sm`/`md` default/`lg`), `disabled`,
  `loading`, `iconOnly` (+ required `aria-label` when true). `Badge` props: `variant`
  (`solid`/`soft`/`outline`/`dot`), `color`
  (`primary`/`secondary`/`success`/`warning`/`destructive`/`info`). (Spec, verbatim from
  Policy Guardrail's actual usage.)

## Review Focus

- **Keyboard-only use of every overlay primitive** (Dialog, Popover, Select, Tabs, Sheet,
  Tooltip): can a user reach, operate, and dismiss each one (Tab/Shift+Tab, Enter/Space,
  Escape, Arrow keys for Select/Tabs) without a mouse? Base UI provides this by default;
  the risk is a wrapper prop or `asChild`-style forwarding mistake silently swallowing it.
  Covered by `userEvent.keyboard`/`userEvent.tab` assertions in each overlay's test.
- **RTL rendering**: does a component laid out with `dir="rtl"` on an ancestor visually
  mirror correctly (icons, padding, text alignment), not just "not crash"? Covered by a
  `dir="rtl"` render variant in Button's and Input's tests (the two components most likely
  to have a stray physical-direction class slip in; if those pass, the pattern is proven
  for the rest).
- **Theme switching at runtime**: components already on screen must pick up a
  `document.documentElement` class change from `.light` to `.dark` (and back) without a
  remount — this is exactly how `useFdsThemeScope` already operates today, so a new
  component that reads the theme once on mount and never again would silently desync.
  Covered by `useThemeMode`'s own test (Task 2) toggling the class and asserting the hook's
  return value updates.
- **Disabled vs. loading Button**: a `loading` Button must not be clickable and must expose
  its busy state to assistive tech (e.g. `aria-busy`), distinct from plain `disabled` —
  spec's anti-goal list calls out accessibility regressions explicitly. Covered in
  Button's test.
- **Icon-only Button without an accessible name**: should be a hard, loud failure
  (thrown error or ESLint-catchable TypeScript requirement), not a silent unlabeled button
  shipped to screen-reader users — one of the concrete a11y regressions the spec's
  anti-goals warn about. Covered by making `aria-label` a required prop in the type
  signature when `iconOnly` is `true` (a discriminated union), plus a test asserting the
  rendered button has an accessible name.

---

## File Structure

```
opencti-platform/opencti-front/src/components/ds/
  tokens.css                 # Task 1: Tailwind import + CSS variable aliases
  lib/
    cn.ts                    # Task 2
    cn.test.ts
    useThemeMode.ts           # Task 2
    useThemeMode.test.tsx
    useDesignTokens.ts         # Task 2
    useDesignTokens.test.tsx
  Button.tsx                 # Task 3
  Button.test.tsx
  Badge.tsx                  # Task 4 (also exports Kbd)
  Badge.test.tsx
  Kbd.tsx
  Kbd.test.tsx
  Input.tsx                  # Task 5
  Input.test.tsx
  Textarea.tsx
  Textarea.test.tsx
  Switch.tsx                 # Task 6
  Switch.test.tsx
  Card.tsx                   # Task 7
  Card.test.tsx
  Tooltip.tsx                # Task 8
  Tooltip.test.tsx
  Popover.tsx                # Task 9
  Popover.test.tsx
  Dialog.tsx                 # Task 10
  Dialog.test.tsx
  Sheet.tsx                  # Task 11
  Sheet.test.tsx
  Tabs.tsx                   # Task 12
  Tabs.test.tsx
  Select.tsx                 # Task 13
  Select.test.tsx
  Sidebar.tsx                # Task 14
  Sidebar.test.tsx
  index.ts                   # Task 15: barrel export
  DesignInspector.tsx        # Task 15
  DesignInspector.test.tsx
```

Modified (Task 1 only, two lines): `src/front.tsx` — add one `import` line for
`tokens.css`.

---

### Task 1: Tailwind v4 + token alias layer

**Files:**
- Create: `opencti-platform/opencti-front/src/components/ds/tokens.css`
- Modify: `opencti-platform/opencti-front/src/front.tsx` (add one import line, after the
  existing `./static/css/design-system-host.css` import)
- Modify: `opencti-platform/opencti-front/package.json` (add `tailwindcss`,
  `@tailwindcss/vite` as dependencies)
- Modify: `opencti-platform/opencti-front/vite.config.ts` (register the Tailwind Vite
  plugin in the existing `plugins: [...]` array, ~line 83)
- Test: `opencti-platform/opencti-front/src/components/ds/tokens.test.ts`

**Interfaces:**
- Produces (CSS custom properties, consumed by every later task via Tailwind arbitrary
  values, e.g. `bg-[var(--card)]`):
  `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`,
  `--popover-foreground`, `--border`, `--input-border`, `--ring`, `--primary`,
  `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`,
  `--muted-foreground`, `--destructive`, `--destructive-foreground`, `--success`,
  `--warning`, `--info`, `--radius-sm` (4px), `--radius-md` (8px), `--radius-full`
  (9999px).

- [ ] **Step 1: Write the failing test**

A plain-Node test (no DOM needed) that the CSS file parses and defines the expected
variable names. Since Vitest doesn't parse CSS by default, assert on the raw source
instead:

```ts
// tokens.test.ts
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf-8');

describe('tokens.css', () => {
  it.each([
    '--background', '--foreground', '--card', '--card-foreground', '--popover',
    '--popover-foreground', '--border', '--input-border', '--ring', '--primary',
    '--primary-foreground', '--secondary', '--secondary-foreground', '--muted',
    '--muted-foreground', '--destructive', '--destructive-foreground', '--success',
    '--warning', '--info', '--radius-sm', '--radius-md', '--radius-full',
  ])('defines %s', (token) => {
    expect(css).toContain(`${token}:`);
  });

  it('imports tailwindcss', () => {
    expect(css).toMatch(/@import\s+["']tailwindcss["']/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/components/ds/tokens.test.ts`
Expected: FAIL (file does not exist / is empty)

- [ ] **Step 3: Add `tailwindcss` and `@tailwindcss/vite` to `package.json`, register the
  plugin in `vite.config.ts`, and write `tokens.css`**

`package.json`: add `"tailwindcss": "^4"` and `"@tailwindcss/vite": "^4"` to
`devDependencies`, then run `yarn install` from the repo root (not just this workspace —
this is a Yarn workspaces monorepo).

`vite.config.ts`: import `tailwindcss from '@tailwindcss/vite'` at the top, and add
`tailwindcss()` to the `plugins: [...]` array (order doesn't matter relative to the
existing entries; Tailwind's Vite plugin is order-independent per its own docs).

`tokens.css`: starts with `@import "tailwindcss";`, then one `:root { ... }` block.
Alias every color token onto the existing Filigran tokens wherever one exists (so an
admin's custom theme, written by `useFdsThemeScope` today, drives these automatically);
hand-pick a value only where Filigran has no equivalent. Exact mapping (verified against
`src/components/fds-tokens.generated.ts` and `src/utils/hooks/useFdsThemeScope.ts`):

| New token | Value |
|---|---|
| `--background` | `var(--bg-elevation-default-layer-0)` |
| `--foreground` | `var(--text-default-primary)` |
| `--card` | `var(--bg-elevation-default-layer-1)` |
| `--card-foreground` | `var(--text-default-primary)` |
| `--popover` | `var(--bg-elevation-default-layer-2)` |
| `--popover-foreground` | `var(--text-default-primary)` |
| `--border` | `var(--border-elevation-default-layer-0)` |
| `--input-border` | `var(--border-elevation-default-layer-1)` |
| `--ring` | `var(--color-filigran-brand-primary)` |
| `--primary` | `var(--color-filigran-brand-primary)` |
| `--primary-foreground` | `#ffffff` (no Filigran equivalent; approximated — see spec) |
| `--secondary` | `var(--color-filigran-tonic-primary)` |
| `--secondary-foreground` | `#ffffff` (approximated) |
| `--muted` | `var(--bg-elevation-default-layer-1)` |
| `--muted-foreground` | `var(--text-default-secondary)` |
| `--destructive` | `var(--color-feedback-error-primary)` |
| `--destructive-foreground` | `#ffffff` (approximated) |
| `--success` | `var(--color-feedback-success-primary)` |
| `--warning` | `var(--color-feedback-warning-primary)` |
| `--info` | `var(--color-feedback-info-primary)` |
| `--radius-sm` | `0.25rem` |
| `--radius-md` | `0.5rem` |
| `--radius-full` | `9999px` |

Note for whoever reads this later: out of the box (no admin customization), `--primary`
will render as Filigran's *current* default brand color, not HUMAIN's literal teal
(`#009688`, sampled from Policy Guardrail screenshots in the spec) — because
`THEME_DARK_DEFAULT_PRIMARY`/`THEME_LIGHT_DEFAULT_PRIMARY` in `ThemeDark.ts`/
`ThemeLight.ts` are themselves sourced from `FDS.colors[mode]['--color-filigran-brand-primary']`,
and this phase deliberately does not touch those files (Global Constraints). Getting an
exact HUMAIN-teal default (vs. just "dynamically correct, whatever color is configured")
is a follow-up decision for a later phase, not required for this one to be correct.

`src/front.tsx`: add `import './components/ds/tokens.css';` on the line after the
existing `import './static/css/design-system-host.css';`.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/components/ds/tokens.test.ts`
Expected: PASS

- [ ] **Step 5: Verify the dev server still boots and the app is visually unchanged**

Run: `yarn dev` (from repo root) and load the app in a browser. Expected: identical to
before this task — no visible change, no console errors. (Tailwind's `@import` only
generates utility classes that get *used*; since nothing references them yet, it should
be a no-op on the rendered page.)

- [ ] **Step 6: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/tokens.css \
        opencti-platform/opencti-front/src/components/ds/tokens.test.ts \
        opencti-platform/opencti-front/src/front.tsx \
        opencti-platform/opencti-front/package.json \
        opencti-platform/opencti-front/vite.config.ts \
        yarn.lock
git commit -m "feat(ds): wire Tailwind v4 and alias token layer onto existing Filigran tokens"
```

---

### Task 2: Shared plumbing — `cn`, `useThemeMode`, `useDesignTokens`

**Files:**
- Create: `src/components/ds/lib/cn.ts`, `src/components/ds/lib/cn.test.ts`
- Create: `src/components/ds/lib/useThemeMode.ts`, `.../useThemeMode.test.tsx`
- Create: `src/components/ds/lib/useDesignTokens.ts`, `.../useDesignTokens.test.tsx`
- Modify: `package.json` — add `clsx`, `tailwind-merge`, `class-variance-authority`,
  `@base-ui-components/react`, `lucide-react` to `dependencies`

**Interfaces:**
- Consumes: Task 1's CSS variables (`useDesignTokens` reads their *computed* values).
- Produces, for every later task:
  - `cn(...inputs: ClassValue[]): string` — merges class lists, later classes win on
    Tailwind conflicts (thin wrapper: `twMerge(clsx(...inputs))`).
  - `useThemeMode(): 'light' | 'dark'` — current theme, re-renders the caller on change.
  - `useDesignTokens(): Record<string, string>` — resolved color values for the current
    mode, keyed by the Task 1 token names *without* the leading `--` (e.g. `primary`,
    `border`), for JS/canvas consumers (graph/chart code migrates to this in a later
    phase; this task only builds and tests the hook itself, per spec Goal 6).

- [ ] **Step 1: Write the failing tests**

```ts
// cn.test.ts
import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
  it('resolves conflicting Tailwind utilities, last one winning', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
```

```tsx
// useThemeMode.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeMode } from './useThemeMode';

describe('useThemeMode', () => {
  afterEach(() => {
    document.documentElement.classList.remove('light', 'dark');
  });

  it('reads the mode already on document.documentElement at mount', () => {
    document.documentElement.classList.add('dark');
    const { result } = renderHook(() => useThemeMode());
    expect(result.current).toBe('dark');
  });

  it('updates when the class changes after mount, without remounting', () => {
    document.documentElement.classList.add('light');
    const { result } = renderHook(() => useThemeMode());
    expect(result.current).toBe('light');
    act(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    });
    expect(result.current).toBe('dark');
  });
});
```

```tsx
// useDesignTokens.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDesignTokens } from './useDesignTokens';

describe('useDesignTokens', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--primary');
  });

  it('resolves a CSS custom property set on the document root', () => {
    document.documentElement.style.setProperty('--primary', '#123456');
    const { result } = renderHook(() => useDesignTokens());
    expect(result.current.primary).toBe('#123456');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn vitest run src/components/ds/lib`
Expected: FAIL (modules don't exist)

- [ ] **Step 3: Add dependencies and implement**

`package.json`: add `clsx`, `tailwind-merge`, `class-variance-authority`,
`@base-ui-components/react`, `lucide-react` to `dependencies` (no version pins specified
here — use whatever `yarn add` resolves as latest stable at implementation time), then
`yarn install` from the repo root.

`cn.ts`: `export function cn(...inputs: ClassValue[]): string` — body is
`twMerge(clsx(...inputs))`, re-exporting `ClassValue` type from `clsx`.

`useThemeMode.ts`: `export function useThemeMode(): 'light' | 'dark'`. Read the initial
mode from `document.documentElement.classList.contains('dark')` as `useState` initializer,
and in a `useEffect`, attach a `MutationObserver` watching `{ attributes: true,
attributeFilter: ['class'] }` on `document.documentElement` that re-derives and sets state
on every class change; disconnect on unmount. (This mirrors exactly how
`useFdsThemeScope` writes the class today — Task 2 only *reads* it, never writes.)

`useDesignTokens.ts`: `export function useDesignTokens(): Record<string, string>`. List
the Task-1 token names (without `--`) as a constant array; on each render (or via a
`useThemeMode()`-triggered recompute, since values change when mode changes), call
`getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim()` for
each and return the resulting object. Internally use `useThemeMode()` as a dependency so
it recomputes on theme change, not on every render.

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn vitest run src/components/ds/lib`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/lib opencti-platform/opencti-front/package.json yarn.lock
git commit -m "feat(ds): add cn, useThemeMode, useDesignTokens shared plumbing"
```

---

### Task 3: Button

**Files:**
- Create: `src/components/ds/Button.tsx`, `src/components/ds/Button.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2).
- Produces:
  ```ts
  type ButtonBaseProps = {
    variant?: 'primary' | 'secondary' | 'destructive'; // default 'primary'
    appearance?: 'solid' | 'outline' | 'ghost';         // default 'solid'
    size?: 'sm' | 'md' | 'lg';                          // default 'md'
    loading?: boolean;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>;
  type ButtonProps =
    | (ButtonBaseProps & { iconOnly?: false })
    | (ButtonBaseProps & { iconOnly: true; 'aria-label': string });
  export function Button(props: ButtonProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children and responds to click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is not clickable while loading, and exposes aria-busy', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is not clickable while disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('requires and exposes an accessible name when iconOnly', () => {
    render(<Button iconOnly aria-label="Close" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('mirrors spacing under dir="rtl" without a hardcoded left/right class', () => {
    const { container } = render(
      <div dir="rtl"><Button>Save</Button></div>,
    );
    const button = container.querySelector('button')!;
    expect(button.className).not.toMatch(/\b(pl|pr|ml|mr)-\d/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn vitest run src/components/ds/Button.test.tsx`
Expected: FAIL (`Button` not defined)

- [ ] **Step 3: Implement `Button` in `Button.tsx`**

Use `class-variance-authority`'s `cva()` to define the `variant`×`appearance`×`size`
class matrix, reading colors via the Task 1 tokens (e.g. solid+primary →
`bg-[var(--primary)] text-[var(--primary-foreground)]`, outline+primary →
`border border-[var(--primary)] text-[var(--primary)]`, ghost → transparent background,
hover state via `hover:bg-[var(--muted)]`). Base shape: `rounded-[var(--radius-full)]`
(pill, matching the screenshots), horizontal padding via logical properties (`px-4` is
already logical in Tailwind — `ps-*`/`pe-*` only needed for asymmetric cases, none here).
`loading` renders a small spinner before the children and sets `aria-busy="true"` plus
`disabled` on the underlying `<button>`. `iconOnly` renders only `children` with square
(not horizontally-padded) sizing and forwards `aria-label`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn vitest run src/components/ds/Button.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/Button.tsx opencti-platform/opencti-front/src/components/ds/Button.test.tsx
git commit -m "feat(ds): add Button primitive"
```

---

### Task 4: Badge + Kbd

**Files:**
- Create: `src/components/ds/Badge.tsx`, `src/components/ds/Badge.test.tsx`
- Create: `src/components/ds/Kbd.tsx`, `src/components/ds/Kbd.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2).
- Produces:
  ```ts
  type BadgeProps = {
    variant?: 'solid' | 'soft' | 'outline' | 'dot'; // default 'solid'
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info'; // default 'primary'
  } & React.HTMLAttributes<HTMLSpanElement>;
  export function Badge(props: BadgeProps): JSX.Element;

  export function Kbd(props: React.HTMLAttributes<HTMLElement>): JSX.Element; // renders a <kbd>
  ```

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge color="success">deployed</Badge>);
    expect(screen.getByText('deployed')).toBeInTheDocument();
  });

  it.each(['solid', 'soft', 'outline', 'dot'] as const)('renders the %s variant without throwing', (variant) => {
    expect(() => render(<Badge variant={variant}>x</Badge>)).not.toThrow();
  });
});
```

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Kbd } from './Kbd';

describe('Kbd', () => {
  it('renders as a <kbd> element', () => {
    render(<Kbd>⌘K</Kbd>);
    expect(screen.getByText('⌘K').tagName).toBe('KBD');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn vitest run src/components/ds/Badge.test.tsx src/components/ds/Kbd.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `Badge` and `Kbd`**

`Badge.tsx`: `cva()` matrix as in Task 3, but for `variant`×`color`. `solid` → background
`var(--{color})`, white text. `soft` → background `color-mix(in srgb, var(--{color}) 16%, var(--card))`
(a tinted background — Tailwind v4 supports `color-mix()` directly in arbitrary values).
`outline` → `border border-[var(--{color})] text-[var(--{color})]`, transparent
background. `dot` → a small `var(--{color})`-filled circle before the children, no
background on the text itself. `rounded-[var(--radius-full)]`.

`Kbd.tsx`: a styled `<kbd>` — small, monospace, `bg-[var(--muted)]`,
`rounded-[var(--radius-sm)]`, thin border. No variants (matches spec's inventory — `Kbd`
has no props beyond children in Policy Guardrail's usage).

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn vitest run src/components/ds/Badge.test.tsx src/components/ds/Kbd.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/Badge.tsx opencti-platform/opencti-front/src/components/ds/Badge.test.tsx opencti-platform/opencti-front/src/components/ds/Kbd.tsx opencti-platform/opencti-front/src/components/ds/Kbd.test.tsx
git commit -m "feat(ds): add Badge and Kbd primitives"
```

---

### Task 5: Input + Textarea

**Files:**
- Create: `src/components/ds/Input.tsx`, `src/components/ds/Input.test.tsx`
- Create: `src/components/ds/Textarea.tsx`, `src/components/ds/Textarea.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2).
- Produces:
  ```ts
  export const Input: React.ForwardRefExoticComponent<
    React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>
  >;
  export const Textarea: React.ForwardRefExoticComponent<
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & React.RefAttributes<HTMLTextAreaElement>
  >;
  ```
  Both are `forwardRef` so form libraries (react-hook-form, Formik — already used
  elsewhere in the app) can register them directly, same as native inputs. No custom
  props beyond native ones: styling is driven entirely by native `disabled`,
  `aria-invalid`, etc. via CSS attribute selectors.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Input } from './Input';

describe('Input', () => {
  it('accepts typed input', async () => {
    render(<Input aria-label="Name" />);
    const input = screen.getByLabelText('Name');
    await userEvent.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });

  it('forwards a ref to the underlying <input>', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="Name" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('renders disabled state natively', () => {
    render(<Input aria-label="Name" disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });

  it('uses no hardcoded left/right classes under dir="rtl"', () => {
    const { container } = render(<div dir="rtl"><Input aria-label="Name" /></div>);
    const input = container.querySelector('input')!;
    expect(input.className).not.toMatch(/\b(pl|pr|ml|mr)-\d/);
  });
});
```

(`Textarea.test.tsx` mirrors the same four cases against `HTMLTextAreaElement`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn vitest run src/components/ds/Input.test.tsx src/components/ds/Textarea.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `Input` and `Textarea`**

Both: `forwardRef` wrapping the native element, `className={cn('<base classes>', className)}`
so a caller can still extend styling. Base classes: `bg-[var(--card)]
border border-[var(--input-border)] rounded-[var(--radius-md)] px-3 py-2
text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]
focus-visible:outline-2 focus-visible:outline-[var(--ring)]
disabled:opacity-50 disabled:cursor-not-allowed
aria-[invalid=true]:border-[var(--destructive)]`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn vitest run src/components/ds/Input.test.tsx src/components/ds/Textarea.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/Input.tsx opencti-platform/opencti-front/src/components/ds/Input.test.tsx opencti-platform/opencti-front/src/components/ds/Textarea.tsx opencti-platform/opencti-front/src/components/ds/Textarea.test.tsx
git commit -m "feat(ds): add Input and Textarea primitives"
```

---

### Task 6: Switch

**Files:**
- Create: `src/components/ds/Switch.tsx`, `src/components/ds/Switch.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2), `@base-ui-components/react`'s `Switch` primitive (handles the
  `role="switch"`/`aria-checked` behavior and keyboard toggling).
- Produces:
  ```ts
  type SwitchProps = {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
  } & Omit<React.ComponentPropsWithoutRef<'button'>, 'onChange'>;
  export function Switch(props: SwitchProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';

describe('Switch', () => {
  it('toggles aria-checked and fires onCheckedChange on click', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Enabled" onCheckedChange={onCheckedChange} />);
    const el = screen.getByRole('switch', { name: 'Enabled' });
    expect(el).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(el);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles via keyboard (Space)', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Enabled" onCheckedChange={onCheckedChange} />);
    const el = screen.getByRole('switch', { name: 'Enabled' });
    el.focus();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/components/ds/Switch.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `Switch` wrapping Base UI's `Switch.Root`/`Switch.Thumb`**

Style the root as a pill track (`rounded-[var(--radius-full)]`) that's
`bg-[var(--primary)]` when checked and `bg-[var(--muted)]` when not, and the thumb as a
circle that translates from the start edge to the end edge using logical positioning
(`inset-inline-start`-based transform, not a hardcoded `translate-x`, so it flips
correctly under `dir="rtl"`).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/components/ds/Switch.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/Switch.tsx opencti-platform/opencti-front/src/components/ds/Switch.test.tsx
git commit -m "feat(ds): add Switch primitive"
```

---

### Task 7: Card

**Files:**
- Create: `src/components/ds/Card.tsx`, `src/components/ds/Card.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2).
- Produces: `export function Card(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;`
  — a single styled `<div>` (per spec's "HUMAIN DS reference inventory": Policy Guardrail
  uses it as a plain content container with no documented sub-parts, unlike Dialog/Sheet).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders its children inside a bordered container', () => {
    render(<Card data-testid="card">content</Card>);
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.getByTestId('card').className).toMatch(/border/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/components/ds/Card.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `Card`**

`bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)]
rounded-[var(--radius-md)]`, merging any passed `className` via `cn`.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/components/ds/Card.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/Card.tsx opencti-platform/opencti-front/src/components/ds/Card.test.tsx
git commit -m "feat(ds): add Card primitive"
```

---

### Task 8: Tooltip

**Files:**
- Create: `src/components/ds/Tooltip.tsx`, `src/components/ds/Tooltip.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2), Base UI's `Tooltip.Root`/`Tooltip.Trigger`/`Tooltip.Portal`/
  `Tooltip.Positioner`/`Tooltip.Popup`, `Tooltip.Provider`.
- Produces (matches spec's inventory exactly — `Tooltip` takes `trigger`/`content` props,
  not children-based composition, per the observed Policy Guardrail call site):
  ```ts
  type TooltipProps = { trigger: React.ReactNode; content: React.ReactNode };
  export function Tooltip(props: TooltipProps): JSX.Element;
  export function TooltipProvider(props: { children: React.ReactNode }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip, TooltipProvider } from './Tooltip';

describe('Tooltip', () => {
  it('shows its content on hover and hides it on unhover', async () => {
    render(
      <TooltipProvider>
        <Tooltip trigger={<button>Hover me</button>} content="Tooltip body" />
      </TooltipProvider>,
    );
    expect(screen.queryByText('Tooltip body')).not.toBeInTheDocument();
    await userEvent.hover(screen.getByText('Hover me'));
    expect(await screen.findByText('Tooltip body')).toBeInTheDocument();
    await userEvent.unhover(screen.getByText('Hover me'));
    expect(screen.queryByText('Tooltip body')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/components/ds/Tooltip.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `Tooltip`/`TooltipProvider` wrapping Base UI**

`TooltipProvider` is a thin re-export of `Tooltip.Provider`. `Tooltip` composes
`Tooltip.Root` → `Tooltip.Trigger` (rendering the `trigger` prop as its child) →
`Tooltip.Portal` → `Tooltip.Positioner` → `Tooltip.Popup` (rendering `content`, styled
`bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--border)]
rounded-[var(--radius-sm)] px-2 py-1 text-sm`).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/components/ds/Tooltip.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/Tooltip.tsx opencti-platform/opencti-front/src/components/ds/Tooltip.test.tsx
git commit -m "feat(ds): add Tooltip primitive"
```

---

### Task 9: Popover

**Files:**
- Create: `src/components/ds/Popover.tsx`, `src/components/ds/Popover.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2), Base UI's `Popover.Root`/`Trigger`/`Portal`/`Positioner`/`Popup`.
- Produces (matches spec: `trigger` prop + `PopoverPopup` child, per observed usage):
  ```ts
  export function Popover(props: { trigger: React.ReactNode; children: React.ReactNode }): JSX.Element;
  export function PopoverPopup(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popover, PopoverPopup } from './Popover';

describe('Popover', () => {
  it('opens on trigger click and closes on outside click', async () => {
    render(
      <>
        <Popover trigger={<button>Open popover</button>}>
          <PopoverPopup>Popover body</PopoverPopup>
        </Popover>
        <div>outside</div>
      </>,
    );
    expect(screen.queryByText('Popover body')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Open popover'));
    expect(await screen.findByText('Popover body')).toBeInTheDocument();
    await userEvent.click(screen.getByText('outside'));
    expect(screen.queryByText('Popover body')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    render(
      <Popover trigger={<button>Open popover</button>}>
        <PopoverPopup>Popover body</PopoverPopup>
      </Popover>,
    );
    await userEvent.click(screen.getByText('Open popover'));
    await screen.findByText('Popover body');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Popover body')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/components/ds/Popover.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `Popover`/`PopoverPopup` wrapping Base UI**

`Popover` composes `Popover.Root` → `Popover.Trigger` (`trigger` prop as child) →
`children` (expected to be a `PopoverPopup`, which internally renders `Popover.Portal` →
`Popover.Positioner` → `Popover.Popup`, styled like Tooltip's popup but with
`p-4` instead of the tooltip's tighter padding).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/components/ds/Popover.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/Popover.tsx opencti-platform/opencti-front/src/components/ds/Popover.test.tsx
git commit -m "feat(ds): add Popover primitive"
```

---

### Task 10: Dialog

**Files:**
- Create: `src/components/ds/Dialog.tsx`, `src/components/ds/Dialog.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2), Base UI's `Dialog.Root`/`Trigger`/`Portal`/`Backdrop`/
  `Popup`/`Title`/`Description`, `Button` (Task 3, for default footer styling reference
  only — not a hard dependency).
- Produces (names match spec's inventory exactly):
  ```ts
  export function Dialog(props: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }): JSX.Element;
  export function DialogTrigger(props: { children: React.ReactNode }): JSX.Element;
  export function DialogPopup(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  export function DialogHeader(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  export function DialogTitle(props: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element;
  export function DialogDescription(props: React.HTMLAttributes<HTMLParagraphElement>): JSX.Element;
  export function DialogFooter(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog, DialogTrigger, DialogPopup, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from './Dialog';

function Example({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger><button>Open dialog</button></DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Deploy policy</DialogTitle>
          <DialogDescription>Confirm deployment.</DialogDescription>
        </DialogHeader>
        <DialogFooter><button>Confirm</button></DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('opens on trigger click, traps focus, and closes on Escape', async () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByText('Open dialog'));
    const dialog = await screen.findByRole('dialog', { name: 'Deploy policy' });
    // Base UI owns exactly which element inside the dialog receives initial focus;
    // assert only that focus moved *into* the dialog, not which element within it.
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/components/ds/Dialog.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `Dialog` and sub-parts wrapping Base UI**

`Dialog` → `Dialog.Root`. `DialogTrigger` → `Dialog.Trigger`. `DialogPopup` →
`Dialog.Portal` + `Dialog.Backdrop` (styled `bg-black/50`) + `Dialog.Popup` (styled
`bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-md)] p-6`, centered
via the Positioner Base UI provides). `DialogHeader`/`DialogFooter` are plain styled
`<div>`s (`mb-4`/`mt-6 flex justify-end gap-2` respectively, both end-aligned using
logical `justify-end` which already respects `dir`). `DialogTitle` → `Dialog.Title`.
`DialogDescription` → `Dialog.Description`.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/components/ds/Dialog.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/Dialog.tsx opencti-platform/opencti-front/src/components/ds/Dialog.test.tsx
git commit -m "feat(ds): add Dialog primitive"
```

---

### Task 11: Sheet

**Files:**
- Create: `src/components/ds/Sheet.tsx`, `src/components/ds/Sheet.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2), Base UI's `Dialog.*` primitives (a Sheet is a Dialog variant —
  same a11y contract, different positioning/animation; Base UI has no separate "Sheet"
  primitive, so this wraps `Dialog.*` the same way Task 10 does, with different popup
  styling).
- Produces (mirrors Task 10's shape, per spec's inventory):
  ```ts
  export function Sheet(props: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }): JSX.Element;
  export function SheetPopup(props: React.HTMLAttributes<HTMLDivElement> & { side?: 'inline-start' | 'inline-end' }): JSX.Element; // default 'inline-end'
  export function SheetHeader(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  export function SheetTitle(props: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element;
  export function SheetDescription(props: React.HTMLAttributes<HTMLParagraphElement>): JSX.Element;
  export function SheetFooter(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  ```
  Note `side` uses `'inline-start' | 'inline-end'`, not `'left' | 'right'` — this is the
  RTL-aware choice (spec Goal 7): under `dir="rtl"`, `inline-end` slides in from the left,
  not the right, matching reading direction instead of a fixed screen side.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet, SheetPopup, SheetTitle } from './Sheet';

describe('Sheet', () => {
  it('renders its content when open, and calls onOpenChange(false) on Escape', async () => {
    const onOpenChange = vi.fn();
    // Sheet.Root has no separate trigger prop in the spec's inventory — render it
    // already open via `open` for this test instead of a trigger click.
    render(
      <Sheet open onOpenChange={onOpenChange}>
        <SheetPopup><SheetTitle>Filters</SheetTitle></SheetPopup>
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('positions at the inline-start edge when side="inline-start"', () => {
    render(
      <Sheet open>
        <SheetPopup side="inline-start" data-testid="popup"><SheetTitle>Filters</SheetTitle></SheetPopup>
      </Sheet>,
    );
    expect(screen.getByTestId('popup').className).toMatch(/inset-inline-start|start-0/);
  });
});
```

(This test is intentionally thinner than Dialog's — Sheet reuses the same Base UI
Dialog primitives and therefore the same focus-trap/Escape behavior already proven in
Task 10; this task's own test only needs to cover what's *different*: the side-based
positioning.)

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/components/ds/Sheet.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `Sheet` wrapping `Dialog.*`**

Same composition as Task 10, but `SheetPopup` is positioned fixed to the `inset-inline-end-0`
(or `inset-inline-start-0` when `side="inline-start"`) edge, full height, with a
slide-in transform transition, `w-96` fixed width. `Sheet`'s own `open` prop must be
forwardable directly to `Dialog.Root` for tests that need to render it pre-opened.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/components/ds/Sheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/Sheet.tsx opencti-platform/opencti-front/src/components/ds/Sheet.test.tsx
git commit -m "feat(ds): add Sheet primitive"
```

---

### Task 12: Tabs

**Files:**
- Create: `src/components/ds/Tabs.tsx`, `src/components/ds/Tabs.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2), Base UI's `Tabs.Root`/`List`/`Tab`/`Panel`/`Indicator`.
- Produces (names match spec's inventory, including `TabsIndicator` seen in the real
  import scan):
  ```ts
  export function Tabs(props: { defaultValue?: string; value?: string; onValueChange?: (value: string) => void; children: React.ReactNode }): JSX.Element;
  export function TabsList(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  export function TabsTrigger(props: { value: string } & React.HTMLAttributes<HTMLButtonElement>): JSX.Element;
  export function TabsContent(props: { value: string } & React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  export function TabsIndicator(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';

describe('Tabs', () => {
  it('shows the default tab\'s content and switches on click', async () => {
    render(
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview content</TabsContent>
        <TabsContent value="rules">Rules content</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('Overview content')).toBeInTheDocument();
    expect(screen.queryByText('Rules content')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Rules'));
    expect(screen.getByText('Rules content')).toBeInTheDocument();
    expect(screen.queryByText('Overview content')).not.toBeInTheDocument();
  });

  it('switches tabs via ArrowRight/ArrowLeft when a tab has focus', async () => {
    render(
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview content</TabsContent>
        <TabsContent value="rules">Rules content</TabsContent>
      </Tabs>,
    );
    screen.getByText('Overview').focus();
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(screen.getByText('Rules content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/components/ds/Tabs.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `Tabs` and sub-parts wrapping Base UI**

Direct re-export/styling wrap of `Tabs.Root`/`Tabs.List`/`Tabs.Tab` (as `TabsTrigger`,
renamed to match the spec's naming)/`Tabs.Panel` (as `TabsContent`)/`Tabs.Indicator`.
`TabsList` styled as a `bg-[var(--muted)] rounded-[var(--radius-md)] p-1 inline-flex`
pill-segmented control (matching the screenshot). `TabsIndicator` styled as the sliding
active-tab background, positioned using Base UI's own indicator measurement (not manual
logical-property math — this is exactly the kind of positioning Base UI computes
correctly under RTL automatically, which is the reason this phase depends on it).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/components/ds/Tabs.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/Tabs.tsx opencti-platform/opencti-front/src/components/ds/Tabs.test.tsx
git commit -m "feat(ds): add Tabs primitive"
```

---

### Task 13: Select

**Files:**
- Create: `src/components/ds/Select.tsx`, `src/components/ds/Select.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2), Base UI's `Select.Root`/`Trigger`/`Value`/`Portal`/
  `Positioner`/`Popup`/`Item`/`ItemText`.
- Produces (names match spec's inventory):
  ```ts
  export function Select(props: { value?: string; defaultValue?: string; onValueChange?: (value: string) => void; children: React.ReactNode }): JSX.Element;
  export function SelectTrigger(props: React.HTMLAttributes<HTMLButtonElement> & { 'aria-label'?: string }): JSX.Element;
  export function SelectValue(props: { placeholder?: string }): JSX.Element;
  export function SelectPopup(props: { children: React.ReactNode }): JSX.Element;
  export function SelectItem(props: { value: string; children: React.ReactNode }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from './Select';

function Example({ onValueChange }: { onValueChange?: (v: string) => void }) {
  return (
    <Select onValueChange={onValueChange}>
      <SelectTrigger aria-label="Action">
        <SelectValue placeholder="Pick action" />
      </SelectTrigger>
      <SelectPopup>
        <SelectItem value="allow">allow</SelectItem>
        <SelectItem value="block">block</SelectItem>
      </SelectPopup>
    </Select>
  );
}

describe('Select', () => {
  it('opens on trigger click, selects an item on click, and closes', async () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Action' }));
    const option = await screen.findByText('allow');
    await userEvent.click(option);
    expect(onValueChange).toHaveBeenCalledWith('allow');
    expect(screen.queryByText('block')).not.toBeInTheDocument();
  });

  it('is operable via keyboard: Enter opens, ArrowDown moves, Enter selects', async () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    screen.getByRole('combobox', { name: 'Action' }).focus();
    await userEvent.keyboard('{Enter}{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/components/ds/Select.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `Select` and sub-parts wrapping Base UI**

`Select` → `Select.Root`. `SelectTrigger` → `Select.Trigger`, styled like `Input`
(Task 5) plus a trailing chevron icon from `lucide-react` (`ChevronDown`). `SelectValue`
→ `Select.Value`. `SelectPopup` → `Select.Portal` + `Select.Positioner` + `Select.Popup`,
styled like `PopoverPopup` (Task 9). `SelectItem` → `Select.Item` + `Select.ItemText`,
with a checkmark (`lucide-react`'s `Check`) shown via Base UI's `Select.ItemIndicator`
when selected.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/components/ds/Select.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/Select.tsx opencti-platform/opencti-front/src/components/ds/Select.test.tsx
git commit -m "feat(ds): add Select primitive"
```

---

### Task 14: Sidebar

**Files:**
- Create: `src/components/ds/Sidebar.tsx`, `src/components/ds/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2). No Base UI dependency — per spec's inventory, Sidebar is a
  layout/context component (expand/collapse state), not an overlay, so it's plain React
  Context + styled `<nav>`/`<div>` elements, not a headless-library wrapper.
- Produces (names match spec's inventory):
  ```ts
  export function SidebarProvider(props: { children: React.ReactNode; defaultOpen?: boolean }): JSX.Element;
  export function Sidebar(props: React.HTMLAttributes<HTMLElement>): JSX.Element; // renders <nav>
  export function SidebarHeader(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  export function SidebarContent(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  export function SidebarGroup(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  export function SidebarGroupContent(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
  export function SidebarMenu(props: React.HTMLAttributes<HTMLUListElement>): JSX.Element; // renders <ul>
  export function SidebarMenuItem(props: React.HTMLAttributes<HTMLLIElement>): JSX.Element; // renders <li>
  export function SidebarMenuButton(props: { isActive?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element;
  export function useSidebar(): { open: boolean; setOpen: (open: boolean) => void; toggle: () => void };
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar,
} from './Sidebar';

function ToggleButton() {
  const { open, toggle } = useSidebar();
  return <button onClick={toggle}>{open ? 'Collapse' : 'Expand'}</button>;
}

describe('Sidebar', () => {
  it('renders menu items and reflects isActive styling', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem><SidebarMenuButton isActive>Policies</SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton>Ontology</SidebarMenuButton></SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );
    expect(screen.getByText('Policies')).toBeInTheDocument();
    expect(screen.getByText('Ontology')).toBeInTheDocument();
  });

  it('useSidebar toggle flips open state, shared across the subtree', async () => {
    render(
      <SidebarProvider defaultOpen>
        <ToggleButton />
      </SidebarProvider>,
    );
    expect(screen.getByText('Collapse')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Collapse'));
    expect(screen.getByText('Expand')).toBeInTheDocument();
  });

  it('useSidebar throws outside a SidebarProvider', () => {
    const Bad = () => { useSidebar(); return null; };
    expect(() => render(<Bad />)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/components/ds/Sidebar.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `Sidebar` and sub-parts**

`SidebarProvider` holds `open`/`setOpen` in a `useState` (seeded from `defaultOpen`,
default `true`) exposed via `React.createContext`; `useSidebar()` reads that context and
throws (`throw new Error(...)`) if called outside a provider (standard context-guard
pattern). `Sidebar` is a `<nav>` styled `bg-[var(--card)] border-e border-[var(--border)]
flex flex-col h-full` (border on the *end* edge — logical, flips under RTL)`,
width driven by the context's `open` value (e.g. `w-64` open, `w-16` collapsed, via `cn`).
`SidebarMenuButton`'s `isActive` toggles `bg-[var(--muted)] font-medium` vs. plain hover
state, matching the "Policies" row highlighted in the spec's reference screenshot.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/components/ds/Sidebar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/Sidebar.tsx opencti-platform/opencti-front/src/components/ds/Sidebar.test.tsx
git commit -m "feat(ds): add Sidebar primitive"
```

---

### Task 15: Barrel export + Design Inspector + visual review

**Files:**
- Create: `src/components/ds/index.ts`
- Create: `src/components/ds/DesignInspector.tsx`, `src/components/ds/DesignInspector.test.tsx`

**Interfaces:**
- Consumes: every component from Tasks 3–14.
- Produces: `export * from './Button'` etc. for all fourteen modules, so later migration
  phases can `import { Button, Dialog, ... } from 'src/components/ds'` (matching the
  `src/*` path alias already configured in `tsconfig.front.json`).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DesignInspector } from './DesignInspector';

describe('DesignInspector', () => {
  it('renders one example of every Foundation-phase primitive without throwing', () => {
    render(<DesignInspector />);
    for (const label of [
      'Buttons', 'Inputs', 'Switch', 'Select', 'Dialog', 'Sheet', 'Popover', 'Tooltip',
      'Tabs', 'Card', 'Badges', 'Kbd', 'Sidebar',
    ]) {
      expect(screen.getByText(new RegExp(label, 'i'))).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/components/ds/DesignInspector.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write `index.ts` and `DesignInspector.tsx`**

`index.ts`: one `export * from './X';` line per component module (`Button`, `Badge`,
`Kbd`, `Input`, `Textarea`, `Switch`, `Card`, `Tooltip`, `Popover`, `Dialog`, `Sheet`,
`Tabs`, `Select`, `Sidebar`), plus `export * from './lib/cn'`,
`export * from './lib/useThemeMode'`, `export * from './lib/useDesignTokens'`.

`DesignInspector.tsx`: a single page-shaped component, structured exactly like Policy
Guardrail's own `src/app/design/page.tsx` (one labeled `<section>` per primitive, each
showing its documented variants) — reuse that file's section layout and variant list
directly as the content plan, swapping only the import source
(`'@humain-foundation/ui'` → `'src/components/ds'`) and the Switch/Select/Sidebar
examples this phase adds that Policy Guardrail's page doesn't show.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/components/ds/DesignInspector.test.tsx`
Expected: PASS

- [ ] **Step 5: Manual visual review against the Policy Guardrail screenshots**

Temporarily render `<DesignInspector />` somewhere reachable in the running app — e.g.
replace the body of one low-traffic existing page's return statement with it, or add a
one-line temporary render call in `src/app.tsx` — run `yarn dev`, open it in a browser,
and compare side-by-side against
`~/Documents/GitLab/policy-guardrail/e2e/design-inspector.spec.ts-snapshots/inspector-dark-visual-darwin.png`.
Confirm: pill-shaped buttons/badges, thin borders, teal-by-default primary (or whatever
color the current Filigran brand token resolves to — see Task 1's note), light and dark
mode both legible. **Revert the temporary render call before committing** — Global
Constraints forbid modifying any file outside `src/components/ds/` and `front.tsx` in
this phase.

- [ ] **Step 6: Commit**

```bash
git add opencti-platform/opencti-front/src/components/ds/index.ts opencti-platform/opencti-front/src/components/ds/DesignInspector.tsx opencti-platform/opencti-front/src/components/ds/DesignInspector.test.tsx
git commit -m "feat(ds): add barrel export and Design Inspector for Foundation-phase primitives"
```
