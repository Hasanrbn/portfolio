export const THEME_STORAGE_KEY = 'theme-preference';
export const THEME_PREFERENCES = ['light', 'dark', 'system'];
export const DARK_QUERY = '(prefers-color-scheme: dark)';
/** What a first-time visitor gets: the site is designed dark first. "System" is still one click away. */
export const DEFAULT_PREFERENCE = 'dark';

export function isThemePreference(value) {
  return THEME_PREFERENCES.includes(value);
}

export function readStoredPreference() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_PREFERENCE;
  } catch {
    // Storage can be blocked (private mode, site data disabled); the page still works.
    return DEFAULT_PREFERENCE;
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
