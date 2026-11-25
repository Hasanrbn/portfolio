import { useState } from 'react';

/**
 * Keeps the filters of one list in component state. The site is a single page, so filters stay
 * out of the address. Returns the same shape the lists use: the chosen values, a setter for one
 * filter, and a function that clears them all.
 */
export default function useLocalFilters(names) {
  const [chosen, setChosen] = useState({});

  const requested = Object.fromEntries(names.map((name) => [name, chosen[name] ?? '']));

  function setFilter(name, value) {
    setChosen((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setChosen({});
  }

  return { requested, setFilter, clearFilters };
}
