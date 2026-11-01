import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

// Resolve via node:url/node:path (not the global `new URL(...)`): this suite's
// default vitest environment is jsdom, whose global URL class does not reliably
// round-trip a `file:` base through a relative resolution, which breaks
// fs.readFileSync's own `file:` scheme check.
const tokensCssPath = join(dirname(fileURLToPath(import.meta.url)), 'tokens.css');
const css = readFileSync(tokensCssPath, 'utf-8');

describe('tokens.css', () => {
  it.each([
    '--background', '--foreground', '--card', '--card-foreground', '--popover',
    '--popover-foreground', '--border', '--input-border', '--ring', '--primary',
    '--primary-foreground', '--secondary', '--secondary-foreground', '--muted',
    '--muted-foreground', '--destructive', '--destructive-foreground', '--success',
    '--warning', '--info', '--ds-radius-sm', '--ds-radius-md', '--ds-radius-full',
  ])('defines %s', (token) => {
    expect(css).toContain(`${token}:`);
  });

  it('does not redefine the Filigran design system\'s own --radius-* tokens', () => {
    expect(css).not.toMatch(/^\s*--radius-[\w-]+\s*:/m);
  });

  // Assertions on @-rules run against the stylesheet with comments stripped, so
  // that prose in the file's comments can't make them pass or fail.
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

  it('imports only Tailwind\'s theme and utilities layers', () => {
    expect(cssWithoutComments).toMatch(/@import\s+["']tailwindcss\/theme\.css["']\s+layer\(theme\)/);
    expect(cssWithoutComments).toMatch(/@import\s+["']tailwindcss\/utilities\.css["']\s+layer\(utilities\)/);
  });

  it('does not import Tailwind\'s preflight, which would restyle the existing app', () => {
    expect(cssWithoutComments).not.toMatch(/@import\s+["']tailwindcss["']/);
    expect(cssWithoutComments).not.toMatch(/preflight/);
  });

  it('limits Tailwind content scanning to this directory', () => {
    expect(cssWithoutComments).toMatch(/source\(none\)/);
    expect(cssWithoutComments).toMatch(/@source\s+["']\.\/["']/);
  });
});
