import { useCallback, useEffect, useState } from 'react';

/**
 * useState that persists to localStorage under `key`. Falls back to `initial`
 * if storage is unavailable (private mode, SSR) or the parsed value fails the
 * optional `validate` predicate.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  validate?: (value: unknown) => value is T
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initial;
      const parsed: unknown = JSON.parse(raw);
      if (validate && !validate(parsed)) return initial;
      return parsed as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage quota / private mode — silently keep in-memory state */
    }
  }, [key, value]);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next));
  }, []);

  return [value, set];
}
