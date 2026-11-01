import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const readMode = (): ThemeMode => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

/**
 * Tracks the `.light` / `.dark` class `useFdsThemeScope` writes onto
 * `document.documentElement`, by observing the DOM rather than adding new React
 * context. This hook only ever reads that class; it never writes it.
 */
export function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(readMode);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setMode(readMode());
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return mode;
}
