import { useSearchParams } from 'react-router';

/**
 * Keeps list filters in the address (`?year=2025&category=Cloud`), so a filtered view can be
 * shared, survives a reload and works with the Back button. `names` are the parameters this
 * list uses. Returns what the address asks for (not yet checked against real options), a
 * setter for one filter, and a function that clears only this list's filters.
 */
export default function useUrlFilters(names) {
  const [searchParams, setSearchParams] = useSearchParams();

  const requested = Object.fromEntries(names.map((name) => [name, searchParams.get(name) ?? '']));

  function setFilter(name, value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    // Replace, so each change does not add a history entry the Back button has to undo.
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    const next = new URLSearchParams(searchParams);
    names.forEach((name) => next.delete(name));
    setSearchParams(next, { replace: true });
  }

  return { requested, setFilter, clearFilters };
}
