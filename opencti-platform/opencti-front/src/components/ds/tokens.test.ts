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
    '--warning', '--info', '--radius-sm', '--radius-md', '--radius-full',
  ])('defines %s', (token) => {
    expect(css).toContain(`${token}:`);
  });

  it('imports tailwindcss', () => {
    expect(css).toMatch(/@import\s+["']tailwindcss["']/);
  });
});
