import React from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import testRender from '../../utils/tests/test-render';
import { defaultColumnsMap } from './dataTableUtils';
import { FDS } from '../fds-tokens.generated';

// Stubbed only for the severity-color test below: it isolates the VALUE dataTableUtils.tsx
// hands to Tag's `color` prop (the thing in scope) from Tag/FDS Chip's own rendering of it
// (out of scope, and not worth coupling this test to FDS Chip's internal wash-color CSS).
vi.mock('../common/tag/Tag', () => ({
  default: ({ label, color }: { label?: string | number | null; color?: string | null }) => (
    <span data-testid="severity-tag" data-color={color ?? ''}>{label}</span>
  ),
}));

const renderColumn = (id: string, data: unknown, helpers?: unknown) => {
  const column = defaultColumnsMap.get(id);
  if (!column?.render) throw new Error(`Column "${id}" has no render function`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return testRender(<div>{column.render(data as any, helpers as any)}</div>);
};

const fileData = (mimetype: string, size: number) => ({
  importFiles: { edges: [{ node: { name: 'sample.bin', metaData: { mimetype }, size } }] },
});

// x_opencti_negative's render function calls useTheme() directly, so — unlike every other
// column exercised in this file — it cannot be invoked as a plain JS function the way
// renderColumn() above does (that evaluates column.render(...) outside any component's body,
// which breaks the Rules of Hooks). This defers the call into a real function component.
const SeverityProbe = ({ value }: { value: boolean }) => {
  const column = defaultColumnsMap.get('x_opencti_negative');
  return <>{column?.render?.({ x_opencti_negative: value }, { t_i18n: (s: string) => s })}</>;
};

describe('dataTableUtils default columns — tooltip anchors', () => {
  // ds/Tooltip (base-ui) does not add role="tooltip" to its popup the way MUI's did, so these
  // assert the same "the tooltip actually opens on hover" behavior by checking that the
  // anchor's text is duplicated once the popup content mounts — same pattern as
  // DataTableHeader.test.tsx's "any tooltip in this file uses ds/Tooltip" guard.
  it('anchors the color tooltip', async () => {
    const { user } = renderColumn('color', { color: '#ff7f50' });
    expect(screen.getAllByText('#ff7f50')).toHaveLength(1);
    await user.hover(screen.getByText('#ff7f50'));
    await waitFor(() => expect(screen.getAllByText('#ff7f50')).toHaveLength(2));
  });

  it('anchors the x_opencti_color tooltip', async () => {
    const { user } = renderColumn('x_opencti_color', { x_opencti_color: '#4b0082' });
    expect(screen.getAllByText('#4b0082')).toHaveLength(1);
    await user.hover(screen.getByText('#4b0082'));
    await waitFor(() => expect(screen.getAllByText('#4b0082')).toHaveLength(2));
  });

  it('anchors the file_size tooltip, on the size the cell shows', async () => {
    const { user } = renderColumn('file_size', fileData('text/plain', 42), {
      b: (value: number) => `${value} Bytes`,
    });
    expect(screen.getAllByText('42 Bytes')).toHaveLength(1);
    await user.hover(screen.getByText('42 Bytes'));
    await waitFor(() => expect(screen.getAllByText('42 Bytes')).toHaveLength(2));
  });

  it('anchors the number_observed tooltip', async () => {
    const { user } = renderColumn('number_observed', { number_observed: 7 }, {
      n: (value: number) => `${value} times`,
    });
    expect(screen.getByText('7 times')).toBeInTheDocument();
    expect(screen.queryByText('7', { exact: true })).not.toBeInTheDocument();
    await user.hover(screen.getByText('7 times'));
    await waitFor(() => expect(screen.getByText('7', { exact: true })).toBeInTheDocument());
    expect(screen.getByText('7 times')).toBeInTheDocument();
  });

  it('anchors the operatingSystem tooltip', async () => {
    const { user } = renderColumn('operatingSystem', { operatingSystem: { name: 'Debian 12' } });
    expect(screen.getAllByText('Debian 12')).toHaveLength(1);
    await user.hover(screen.getByText('Debian 12'));
    await waitFor(() => expect(screen.getAllByText('Debian 12')).toHaveLength(2));
  });

  it('any tooltip in dataTableUtils.tsx uses ds/Tooltip, not a raw MUI Tooltip', () => {
    const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'dataTableUtils.tsx');
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).not.toMatch(/@mui\/material\/Tooltip/);
    expect(source).toMatch(/from '\.\.\/ds'/);
  });
});

describe('dataTableUtils default columns — tags', () => {
  it('the tag-value cell renderer uses ds/Badge, not the FDS Chip', async () => {
    // Static guard, scoped to the `tags` column only: `x_opencti_aliases` (a different column)
    // keeps the FDS Chip deliberately, so this must not assert "no Chip anywhere in the file".
    const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'dataTableUtils.tsx');
    const source = readFileSync(sourcePath, 'utf-8');
    const tagsColumnSource = source.slice(source.indexOf('\n  tags: {'), source.indexOf('\n  threat_actor_types: {'));
    expect(tagsColumnSource).toMatch(/<Badge/);
    expect(tagsColumnSource).not.toMatch(/<Chip/);

    const { user } = renderColumn('tags', { tags: ['alpha', 'beta'] });
    const firstBadge = screen.getByText('alpha');
    expect(firstBadge.tagName).toBe('SPAN');
    // ds/Badge's own base class (Badge.tsx), confirming this is really ds/Badge rendering,
    // not a lookalike span.
    expect(firstBadge.className).toMatch(/rounded-\[var\(--ds-radius-full\)\]/);
    // Neutral treatment, not a `color` enum value: ds/Badge's own color enum is all
    // semantic/brand (its "secondary" aliases Filigran's reserved tonic/brand-accent token —
    // see ds/tokens.css's `--secondary`), which @filigran/design-system's own Chip usage
    // contract (Chip.md RULE-02) says is the wrong tool for a plain tag with no meaning of its
    // own. This asserts the actual rendered neutral styling (ds/tokens.css's real --border/
    // --foreground tokens), not that a particular `color` prop was passed.
    const badgeStyle = firstBadge.getAttribute('style') ?? '';
    expect(badgeStyle).toMatch(/border-color:\s*var\(--border\)/);
    expect(badgeStyle).toMatch(/color:\s*var\(--foreground\)/);
    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.queryByText('beta')).not.toBeInTheDocument();

    await user.hover(firstBadge);
    await waitFor(() => expect(screen.getAllByText('alpha')).toHaveLength(2));
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('shows the empty value when there are no tags', () => {
    renderColumn('tags', { tags: [] });
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

describe('dataTableUtils default columns — severity color coding', () => {
  it('severity-based color coding resolves to the correct ds/tokens.css token for each severity level', () => {
    // ds/tokens.css aliases --destructive and --success onto the exact same FDS feedback keys
    // that ThemeDark/ThemeLight's palette.severity.critical/low already resolve from
    // (migration-state.json's migratedZones already lists "palette.severity" as migrated).
    // This proves the two systems agree on the resolved VALUE, against the real token names —
    // not a guessed hex — without touching the non-visual mapping decision itself (critical for
    // a true positive, low for a false positive stays exactly as-is in dataTableUtils.tsx).
    const tokensCssPath = join(dirname(fileURLToPath(import.meta.url)), '../ds/tokens.css');
    const tokensCss = readFileSync(tokensCssPath, 'utf-8');
    expect(tokensCss).toMatch(/--destructive:\s*var\(--color-feedback-error-primary\)/);
    expect(tokensCss).toMatch(/--success:\s*var\(--color-feedback-success-primary\)/);

    const criticalHex = FDS.colors.dark['--color-feedback-error-primary'];
    const lowHex = FDS.colors.dark['--color-feedback-success-primary'];

    // testRender (test-render.tsx) wraps every render in the real, production ThemeDark().
    // Non-visual mapping preserved exactly, per dataTableUtils.tsx: x_opencti_negative true ->
    // "False positive" -> severity.low (green); false -> "True positive" -> severity.critical (red).
    testRender(<SeverityProbe value />);
    expect(screen.getByTestId('severity-tag').dataset.color).toBe(lowHex);

    testRender(<SeverityProbe value={false} />);
    expect(screen.getAllByTestId('severity-tag').at(-1)?.dataset.color).toBe(criticalHex);
  });
});

describe('dataTableUtils default columns, allowed markings', () => {
  it('shows one marking chip and lists the others in the tooltip', async () => {
    const { user } = renderColumn('allowed_markings', {
      allowed_markings: [
        { id: 'm1', definition: 'PAP:RED' },
        { id: 'm2', definition: 'TLP:AMBER' },
        { id: 'm3', definition: 'PAP:AMBER' },
      ],
    });
    expect(screen.getByText('PAP:RED')).toBeInTheDocument();
    expect(screen.queryByText('TLP:AMBER')).not.toBeInTheDocument();
    expect(screen.queryByText('PAP:AMBER')).not.toBeInTheDocument();
    await user.hover(screen.getByText('PAP:RED'));
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('TLP:AMBER');
    expect(tooltip).toHaveTextContent('PAP:AMBER');
  });
});
