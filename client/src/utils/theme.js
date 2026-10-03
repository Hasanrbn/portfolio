export const THEME_STORAGE_KEY = 'theme-preference';
export const THEME_PREFERENCES = ['light', 'dark', 'system'];
export const DARK_QUERY = '(prefers-color-scheme: dark)';

export function isThemePreference(value) {
  return THEME_PREFERENCES.includes(value);
}

export function readStoredPreference() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    // Storage can be blocked (private mode, site data disabled); the page still works.
    return 'system';
  }
}

export function storePreference(preference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Without storage the choice only lasts for this visit.
  }
}

export function resolveTheme(preference, systemPrefersDark) {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return systemPrefersDark ? 'dark' : 'light';
}

export function applyTheme(resolvedTheme) {
  document.documentElement.dataset.theme = resolvedTheme;
}
