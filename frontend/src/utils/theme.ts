export type Theme = 'light' | 'dark';

const THEME_KEY = 'theme';
const hasWindow = typeof window !== 'undefined';

export function getInitialTheme(): Theme {
  if (!hasWindow) return 'light';

  try {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme) {
  if (!hasWindow) return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function persistTheme(theme: Theme) {
  if (!hasWindow) return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function setAppTheme(theme: Theme) {
  applyTheme(theme);
  persistTheme(theme);
}

export function initializeTheme() {
  applyTheme(getInitialTheme());
}
