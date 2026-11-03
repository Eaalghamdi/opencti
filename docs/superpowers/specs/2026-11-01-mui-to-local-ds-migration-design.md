# Replace MUI with a local, HUMAIN-DS-inspired component library across the OpenCTI frontend

## Intent and why

OpenCTI's frontend (`opencti-platform/opencti-front`) is built on MUI (Material UI) v9 +
Emotion, with an official but partial, in-flight migration toward Filigran's own
`@filigran/design-system` (governed by `fds-migration/scripts/check-mui-regression.mjs`
in CI). The person running this HCTI (HUMAIN's internal fork of OpenCTI) instance doesn't
think the current UI "looks great" and wants it modernized, away from MUI.

HUMAIN has its own internal design system, `@humain-foundation/ui` (v2.0.27, published to
a private npm registry on `gitlab.humain.com`), already used in production by another
internal app, Policy Guardrail (`~/Documents/GitLab/policy-guardrail`). HUMAIN owns that
package. Nobody working on this task currently has GitLab access to `gitlab.humain.com`
from this environment (confirmed: the host responds but returns 403 without a token, and
no `GITLAB_TOKEN` is available here), so the real package cannot be installed or extended
directly right now.

Agreed path: build a **local component library inside the OpenCTI repo** that follows the
same architecture as HUMAIN DS (Tailwind CSS v4, CSS-custom-property theming, composable
Radix/Base-UI-style primitive APIs) and visually approximates it, based on:
- Rendered e2e visual-regression screenshots from Policy Guardrail (thin 1px borders,
  pill-shaped buttons/badges, generous whitespace, monospace uppercase section labels,
  persistent left-nav sidebar + thin top bar, teal-ish primary color, light mode by
  default with dark-mode support via `next-themes`).
- The actual component import surface used in Policy Guardrail's source (ground truth for
  the real API shapes — see "HUMAIN DS reference inventory" below).
- CSS custom property *names* visible in Policy Guardrail's `theme-override.css` /
  `globals.css` (`--border`, `--card`, `--muted-foreground`, `--ring`,
  `--font-family-display`, `--font-family-body`, `--font-family-mono`) — not their actual
  values, which aren't available anywhere on this machine (confirmed: no cached npm
  tarball, no `.next`/`dist` build output, nothing in the global npm cache).

The user has explicitly accepted that this will be a close visual approximation, not a
pixel-perfect match, and that light mode is an acceptable default (Palantir — dark theme,
dense data tables, graph visualizations — was the original aesthetic reference point, but
is secondary inspiration, not a hard requirement, now that HUMAIN DS itself is the primary
target).

This document covers the frontend-library and migration effort only. It does not cover
getting real GitLab access or upstreaming anything — see Non-goals.

## Current state (facts gathered, not guesses)

- `opencti-front` has **5,212** TypeScript/TSX source files; **1,115** of them (~21%)
  import from some `@mui/*` package.
- At least **67 distinct** `@mui/material/<Component>` default-import component types are
  in active use, including ones with no HUMAIN-DS equivalent today: `Table`/`TableBody`/
  `TableHead`/`TableRow`/`TableCell`/`TableContainer`, `Autocomplete`, `TextField`,
  `Stepper`/`Step`/`StepLabel`/`StepButton`, `Menu`/`MenuItem`/`MenuList`, `Accordion`/
  `AccordionSummary`/`AccordionDetails`, `Slider`, `Drawer`, `Grid`, `List`/`ListItem`/
  `ListItemButton`/`ListItemIcon`/`ListItemText`/`ListItemAvatar`/`ListSubheader`,
  `Avatar`, `Chip` (chip exists in MUI but not confirmed in the HUMAIN DS inventory as a
  standalone — `Badge` is the closest known equivalent), `Alert`/`AlertTitle`, `AppBar`/
  `Toolbar`, `Paper`, `Divider`, `Skeleton`, `CircularProgress`/`LinearProgress`,
  `ToggleButton`/`ToggleButtonGroup`, `Radio`, `FormControl`/`FormControlLabel`/
  `FormGroup`/`FormHelperText`/`InputLabel`/`InputAdornment`, `Collapse`/`Slide`,
  `Popover` (HUMAIN DS has this one), `CssBaseline`, `Box`/`Stack` (layout primitives).
- OpenCTI also depends on `@mui/x-date-pickers` (date/time pickers) and `@mui/lab`
  (unstable components) — not included in the 67-type count above, additional surface.
- OpenCTI already has a working light/dark theme system of its own (MUI `ThemeProvider`
  based) that the whole app depends on today. It goes further than static light/dark:
  `src/private/components/settings/themes/` (`ThemeCreation.tsx`, `ThemeForm`, the
  `themeAdd` GraphQL mutation) lets an admin create named, persisted custom themes —
  `theme_background`, `theme_paper`, `theme_nav`, `theme_primary`, `theme_secondary`,
  `theme_accent`, `theme_text_color`, `theme_logo`, `theme_logo_collapsed`,
  `theme_logo_login`, `theme_login_aside_*` — selectable at runtime per user/instance.
  Whether this admin-branding feature stays in scope is an open question below; it
  materially changes the Foundation-phase architecture if so (see "Open questions").
- ~296 files read color values via `theme.palette.*` directly in TS/TSX logic, not just
  through MUI component props — including 19 files inside graph-visualization code
  (`src/components/graph`, `src/utils/graph`) and `src/utils/Colors.ts`, which assigns
  colors to entity types for canvas/SVG rendering and charts. CSS custom properties alone
  aren't naturally consumable by that kind of JS/canvas color logic — see "Open
  questions" for how this interacts with the custom-theming question.
- `@mui/icons-material` is imported in **534 files** — a surface on the same order as
  `Table`/`Autocomplete`. Neither HUMAIN DS's own usage (per the Policy Guardrail scan)
  nor this doc's original draft named an icon replacement. Decided: use `lucide-react` —
  it's already a direct dependency of Policy Guardrail alongside `@humain-foundation/ui`,
  so it's the evident real icon choice for this design language, not a guess. There's no
  1:1 automatic name mapping from Material icon names to Lucide, so building that mapping
  is part of the migration-tooling work already left to the builder.
- There is an existing, partial, **official** migration in this repo toward
  `@filigran/design-system` (see root `AGENTS.md`, `.github/instructions/`,
  `fds-migration/`), with a CI-enforced gate (`check-mui-regression.mjs`) that blocks new
  MUI usage where that design system already has a replacement, and a conformity checker
  (`check-fds-conformity.mjs`) for generated bridge files. This effort **replaces** that
  direction per the user's explicit choice (full rip-and-replace, whole app, not a pilot),
  but the existing gates must be dealt with explicitly (see Constraints), not silently
  left to rot or conflict.

### HUMAIN DS reference inventory (ground truth from Policy Guardrail's actual usage)

Extracted by scanning every `import { ... } from "@humain-foundation/ui"` in
`~/Documents/GitLab/policy-guardrail/src/**/*.ts(x)`:

`Badge`, `Button`, `Card`, `Dialog` (+ `DialogTrigger`/`DialogPopup`/`DialogHeader`/
`DialogTitle`/`DialogDescription`/`DialogFooter`), `Input`, `Kbd`, `Popover` (+
`PopoverPopup`), `Select` (+ `SelectTrigger`/`SelectValue`/`SelectPopup`/`SelectItem`),
`Sheet` (+ `SheetHeader`/`SheetTitle`/`SheetDescription`/`SheetFooter`/`SheetPopup`),
`Sidebar` (+ `SidebarProvider`/`SidebarContent`/`SidebarGroup`/`SidebarGroupContent`/
`SidebarHeader`/`SidebarMenu`/`SidebarMenuButton`/`SidebarMenuItem`), `Switch`, `Tabs`
(+ `TabsList`/`TabsTrigger`/`TabsContent`/`TabsIndicator`), `Textarea`, `ThemeProvider`/
`useTheme`, `Tooltip`/`TooltipProvider`.

Observed component API conventions to mirror locally:
- `Button` takes `variant` (`primary`/`secondary`/`destructive`), a separate `appearance`
  prop (`outline`/`ghost`, default solid), `size` (`sm`/default/`lg`), `disabled`,
  `loading`, and `iconOnly` boolean (paired with `aria-label` for icon-only buttons).
- `Badge` takes `variant` (`solid`/`soft`/`outline`/`dot`) and `color`
  (`primary`/`secondary`/`success`/`warning`/`destructive`/`info`).
- Compound components (`Dialog`, `Select`, `Sheet`, `Popover`, `Tabs`, `Sidebar`) follow a
  Trigger/Popup/sub-part composition pattern, not single mega-components with a dozen
  props — this is the pattern to replicate for the new local primitives too, including the
  ones HUMAIN DS doesn't have yet (e.g. a local `Table` should expose composable
  `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell`, not one monolithic props blob).
- Theming is 100% CSS custom properties consumed via Tailwind arbitrary-value utilities
  (`bg-[var(--card)]`, `text-[var(--muted-foreground)]`, `border-[var(--border)]`), with a
  `ThemeProvider`/`useTheme` pair (backed by `next-themes` upstream; the local port should
  use a framework-agnostic equivalent since this app is Vite, not Next.js) controlling a
  `dark`/`light` class or `data-theme` attribute on the root.
- A `data-density="compact"|"comfortable"` attribute pattern exists for density switching
  (seen on the Design Inspector page) — optional to carry over, not required by HUMAIN DS
  itself as far as observed.

## Goals

1. Replace MUI (`@mui/material`, `@mui/lab`, `@mui/icons-material`, `@mui/x-date-pickers`)
   and Emotion, across the **entire** `opencti-front` app, with a new local component
   library that visually approximates HUMAIN DS and follows its architecture (Tailwind v4,
   CSS-variable theming, composable primitive APIs).
2. Full component coverage: both the ~15 primitives HUMAIN DS already has, and the
   remaining ~50 additional types OpenCTI needs that HUMAIN DS doesn't (most critically
   `Table` and `Autocomplete`, which are used pervasively — most list views are dense
   tables, and nearly every entity-reference field in every form is an autocomplete).
3. Preserve all existing functionality and behavior — this is a visual/library swap, not a
   feature change. Sorting, filtering, search, pagination, drag-and-drop, form validation,
   accessibility (keyboard nav, focus management, ARIA) must keep working at least as well
   as today.
4. Support both light and dark themes; keep OpenCTI's existing dark theme usable
   throughout and after the migration.
5. Keep the app in a usable state throughout the migration — no long stretch where it's
   broken or has jarringly inconsistent mixed styling within the same screen.
6. Preserve the existing admin-configurable per-instance custom theming feature (brand
   colors, logos — see `theme_background`/`theme_primary`/etc. in Current State) exactly:
   theming must stay dynamic and GraphQL-driven at runtime, not a static token file, and
   the ~296 files that read color values directly in JS/TS (including graph/chart
   rendering) need an equivalent JS-readable token API alongside the CSS variables.
7. Build directionality-awareness (logical CSS properties — `margin-inline-start` style,
   not hardcoded left/right — composable primitives that respect `dir`) into every new
   primitive from the start, even though no RTL language is supported or planned yet. This
   is cheap to do now and expensive to retrofit into ~50 already-built components later.

## Non-goals

- Installing or depending on the real `@humain-foundation/ui` npm package — blocked on
  GitLab registry access; out of scope for this effort.
- Pixel-perfect reproduction of HUMAIN DS's actual token values — approximated from
  screenshots and variable names, by explicit agreement with the user.
- Changing OpenCTI's build tooling framework (stays on Vite + Yarn workspaces; not
  migrating to Next.js). Tailwind v4 has first-class Vite support via `@tailwindcss/vite`
  or PostCSS.
- Redesigning OpenCTI's information architecture, routes, GraphQL/Relay data layer, or
  features — this is a component/visual-layer replacement only.
- Upstreaming any of this work into the real `@humain-foundation/ui` package. (Code should
  still be written in a style that *could* be upstreamed later if access is obtained, but
  that's a nice-to-have, not a requirement to design for.)

## Anti-goals (would make this a failure even if it "ships")

- Any regression in functionality: broken forms, lost sort/filter/search/pagination in
  tables, broken entity-autocomplete search, broken date/time pickers, broken
  import/export flows, broken drag-and-drop (used for e.g. kill-chain-phase ordering),
  accessibility regressions (keyboard traps, lost focus management, missing ARIA roles
  that compound Radix-style components normally provide for free).
- A half-migrated app where old (MUI) and new styling visibly clash within the same
  screen for an extended period, rather than a deliberate, scoped, module-by-module
  cutover.
- Leaving the existing Filigran `check-mui-regression.mjs` / `check-fds-conformity.mjs`
  CI gates silently fighting the new direction (e.g. still blocking on old rules, or
  passing vacuously without anyone noticing they no longer check anything meaningful).

## Constraints

- No network/registry access to `@humain-foundation/ui`'s source or npm package from this
  environment or, as far as is known, from the user's current GitLab account.
- Real token values (colors, spacing scale, radii, type scale) are not available; only
  approximations derived from screenshots and observed CSS variable *names*.
- This is a large repo: 5,212 frontend source files, 1,115 of them MUI-dependent, across
  67+ distinct component types plus `@mui/x-date-pickers` and `@mui/lab`. This cannot
  realistically be a single PR/session; it needs to be broken into phases (see "Left to
  the builder").
- The repo has existing, CI-enforced governance tooling for the *previous* official
  migration direction (`fds-migration/`) that must be explicitly addressed, not ignored.
- This is a local dev fork with no production deployment or external users yet, which
  gives real latitude on migration sequencing risk (no live-traffic blast radius to
  protect) — but the person running it is actively using it day to day, so "usable
  throughout" still matters practically, not just in principle.

## Decided (explicitly, in conversation)

- Scope: full rip-and-replace of MUI, across the whole app (not a single pilot
  page/module) — user's explicit choice over a lighter MUI-retheme option.
- Target direction: build toward HUMAIN DS's visual language and component API
  conventions, not a generic third-party kit like shadcn/ui.
- Since real GitLab/npm access isn't available, extend "locally, in this repo" instead of
  the real `@humain-foundation/ui` package.
- Visual approximation from screenshots/variable names is accepted as "close enough" —
  no further chase for exact token values before proceeding.
- Light mode is an acceptable look (not required to be dark-first); dark mode should
  remain supported since OpenCTI already has users relying on it today.
- This fork is diverging from upstream OpenCTI for good — no further upstream merges are
  planned. A straightforward in-place, file-by-file rewrite is acceptable; no
  upstream-diff-absorbing adapter/shim layer is needed. (If that ever changes, treat it
  as a new decision, not an assumption to revisit silently.)
- The admin-configurable per-instance custom theming feature (brand colors, logos) must
  be preserved exactly — see Goal 6. Theming stays dynamic/GraphQL-driven at runtime.
- Directionality-awareness (RTL-ready logical CSS properties) is built into every new
  primitive from the start — see Goal 7 — even though no RTL language is supported today.
- Re-confirmed at the start of Phase 2 (2026-11-02): the `fds-migration/` constraint above
  was investigated — it is real, on `master`, with `@filigran/design-system@1.3.0` actually
  installed, 56 components already adopted (`libComponentUsage`), and a CI gate
  (`check-mui-regression.mjs`) enforcing 17 component types, 7 of which overlap with
  primitives this project already built (Button, Tooltip, Badge, Input, Textarea, Switch,
  Select). The user's explicit choice is to keep building the local HUMAIN-DS library and
  proceed as planned, accepting the duplication with `fds-migration`'s enforcement as a
  known, deliberate tradeoff — not an oversight — in favor of brand/product consistency
  with HUMAIN's own design system across its app suite (Policy Guardrail, etc.) rather than
  Filigran's generic one. Phase 6 ("Cleanup") remains the point where `fds-migration`'s CI
  gates get retired or repointed at the new local library.

## Left to the builder

- **Exact library location/structure** inside `opencti-front` (e.g.
  `src/components/ds/` as a new local "design system" folder, with one file/folder per
  primitive, mirroring the Trigger/Popup/sub-part composition pattern observed in HUMAIN
  DS).
- **Phasing and build order**, because 67+ component types and 1,115 files cannot be one
  plan. Recommended phase shape (to be turned into real plans with
  `superpowers:writing-plans`, phase by phase, not committed to in full here):
  1. *Foundation*: Tailwind v4 wired into the Vite build, CSS-variable token set
     (approximated), a theme provider that supports light/dark **and** dynamic
     GraphQL-driven per-instance custom themes (the existing `theme_background`/
     `theme_primary`/etc. admin feature — likely: resolve the active theme's values to
     CSS custom properties injected at the document root, same mechanism as today just
     retargeted at the new variable names), a parallel JS-readable token
     accessor (e.g. a `useDesignTokens()` hook or small resolved-values module) for the
     ~296 files that read colors in JS/TS today — including graph/chart rendering color
     logic — and directionality-aware primitives from day one (logical CSS properties,
     `dir`-respecting composition) for the ~15 primitives HUMAIN DS already has (Button,
     Input, Textarea, Select, Dialog, Sheet, Sidebar, Tabs, Card, Badge, Switch, Tooltip,
     Popover, Kbd). Build and visually review against the screenshots before anything
     else starts — this phase is now the highest-complexity one, not the simplest.
  2. *The two hard, pervasive ones*: a local `Table` (sortable/filterable, matching
     OpenCTI's current list-view behavior) and a local `Autocomplete`/combobox (async
     entity search) — these unlock the largest share of the 1,115 files and are the
     highest-risk, highest-value components to get right early.
  3. *Forms & overlays long tail*: Menu, Accordion, Slider, Drawer, Avatar, Chip, Alert,
     date/time picker, Stepper, form helper components (FormControl/FormHelperText/
     InputLabel/Radio/ToggleButton), progress indicators, Collapse/Slide transitions.
  4. *App shell*: AppBar/Toolbar, layout Grid/Stack/Box equivalents (likely just Tailwind
     flex/grid utilities directly, no component needed), Paper/Divider/Skeleton.
  5. *File-by-file migration* of the 1,115 MUI-dependent files onto the new library,
     module by module (e.g. by top-level route/section), keeping MUI and the new library
     co-existing in the app during the transition rather than one atomic flip.
  6. *Cleanup*: remove `@mui/*` and `@emotion/*` dependencies, retire or repoint
     `fds-migration/`'s CI gates at the new local library so it's enforced the same way
     MUI-avoidance is enforced today.
- **Migration tooling**: whether to hand-migrate file by file, or invest in a codemod
  (e.g. jscodeshift) for the most mechanical, high-volume swaps (simple Button/Badge/
  Dialog usages) to save time on the long tail, reserving hand-migration for
  Table/Autocomplete call sites and anything with non-trivial MUI-specific behavior.
- **What to do with `@mui/x-date-pickers` and `@mui/lab`** specifically — likely need
  their own local replacements (date/time picker, any `@mui/lab` components still in use)
  as part of phase 3 above; exact scope of `@mui/lab` usage not yet inventoried in this
  document.
- **Validation strategy per phase**: visual comparison against current screenshots of each
  migrated screen, plus running the app and clicking through the golden path for that
  module, before calling a phase done. (OpenCTI does have its own Vitest/Playwright test
  suites; the builder should check whether relevant UI tests exist per module and keep
  them passing, rather than assuming total coverage.)
- **Exact token values** (colors, spacing, radii) — approximated now; if real values
  become available later (e.g. a teammate exports the real `styles.css`), the builder
  should swap them in without needing to redo component structure, since theming is
  isolated to CSS custom properties.

## Known gaps for future work

- **`ds/Combobox` multi-select closes its popup after a filtered selection.** When the
  input sits outside the popup (every current call site), Base UI's own `AriaCombobox.js`
  closes the popup on selection if the user had typed a filter first, even though
  `ds/Combobox`'s `multiple` mode otherwise stays open across selections (matching MUI's
  old `disableCloseOnSelect`). `ds/Combobox`'s `ComboboxProps` exposes no `open`/
  `onOpenChange` escape hatch to override this. First hit migrating
  `FilterEntityAutocomplete.tsx` (2026-11-02), where picking several options after typing a
  search now takes an extra click per pick instead of staying open. A future `ds/Combobox`
  enhancement should expose a way to keep the popup open across a filtered multi-select,
  the way MUI's `disableCloseOnSelect` did.
