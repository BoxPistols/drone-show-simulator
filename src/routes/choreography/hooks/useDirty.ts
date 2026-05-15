import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tracks "dirty" state by JSON-comparing the current value against the last
 * marker. Hooks `beforeunload` so users get a browser confirmation before
 * leaving with unsaved changes.
 */
export function useDirty<T>(value: T): {
  isDirty: boolean;
  markClean: (next?: T) => void;
} {
  const markerRef = useRef<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (markerRef.current === null) {
      markerRef.current = serialized;
      return;
    }
    setIsDirty(markerRef.current !== serialized);
  }, [value]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the returnValue text but require it to be set
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const markClean = useCallback(
    (next?: T) => {
      markerRef.current = JSON.stringify(next ?? value);
      setIsDirty(false);
    },
    [value]
  );

  return { isDirty, markClean };
}
