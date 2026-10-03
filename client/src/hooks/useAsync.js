import { useCallback, useEffect, useState } from 'react';

const LOADING = { status: 'loading', data: null, error: null };

/**
 * Runs an async function when the component mounts and reports its progress as
 * { status: 'loading' | 'success' | 'error', data, error, retry }.
 * `load` must be a stable reference (a module-level function or one wrapped in useCallback).
 * A result that arrives after the component has left, or after a newer attempt started, is ignored.
 */
export default function useAsync(load) {
  const [state, setState] = useState(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    load().then(
      (data) => {
        if (!ignore) setState({ status: 'success', data, error: null });
      },
      (error) => {
        if (!ignore) setState({ status: 'error', data: null, error });
      },
    );

    return () => {
      ignore = true;
    };
  }, [load, attempt]);

  const retry = useCallback(() => {
    setState(LOADING);
    setAttempt((count) => count + 1);
  }, []);

  return { ...state, retry };
}
