import { useMemo } from 'react';
import { useThemeMode } from './useThemeMode';

/**
 * The tokens.css custom property names, without their leading `--`. Keep this in
 * sync with tokens.css — see tokens.test.ts for the list this mirrors.
 */
const TOKEN_NAMES = [
  'background', 'foreground', 'card', 'card-foreground', 'popover',
  'popover-foreground', 'border', 'input-border', 'ring', 'primary',
  'primary-foreground', 'secondary', 'secondary-foreground', 'muted',
  'muted-foreground', 'destructive', 'destructive-foreground', 'success',
  'warning', 'info', 'radius-sm', 'radius-md', 'radius-full',
] as const;

/**
 * Resolves the Task 1 CSS custom properties to their computed values for the
 * current mode, keyed by token name without the leading `--`. For future JS/canvas
 * consumers (e.g. graph/chart rendering) that need colors as plain values instead
 * of CSS. Recomputes when the theme mode changes, not on every render.
 */
export function useDesignTokens(): Record<string, string> {
  const mode = useThemeMode();

  return useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    const tokens: Record<string, string> = {};
    TOKEN_NAMES.forEach((name) => {
      tokens[name] = styles.getPropertyValue(`--${name}`).trim();
    });
    return tokens;
  }, [mode]);
}
