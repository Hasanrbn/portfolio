import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './ThemeContext.js';
import {
  DARK_QUERY,
  applyTheme,
  readStoredPreference,
  resolveTheme,
  storePreference,
} from '../utils/theme.js';

export default function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readStoredPreference);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia(DARK_QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const handleChange = (event) => setSystemPrefersDark(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme = resolveTheme(preference, systemPrefersDark);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setPreference = useCallback((next) => {
    setPreferenceState(next);
    storePreference(next);
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
