import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext, type ToastApi } from './toastContext';

interface ToastEntry {
  id: number;
  msg: string;
}

interface Props {
  children: ReactNode;
  /** Duration in ms before auto-dismiss. Default 2400. */
  duration?: number;
}

/**
 * Single-toast queue with `role="status"` + `aria-live="polite"` so screen
 * readers announce updates without preempting the user. The container always
 * stays mounted (with empty content) so SR cursors don't lose the live region.
 */
export function ToastProvider({ children, duration = 2400 }: Props) {
  const [current, setCurrent] = useState<ToastEntry | null>(null);
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (msg: string) => {
      idRef.current += 1;
      const next: ToastEntry = { id: idRef.current, msg };
      setCurrent(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCurrent((prev) => (prev?.id === next.id ? null : prev));
      }, duration);
    },
    [duration]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  const visible = current !== null;
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: visible ? 'rgba(8, 11, 22, 0.94)' : 'transparent',
          color: '#fff',
          padding: visible ? '12px 22px' : 0,
          borderRadius: 10,
          border: visible ? '1px solid rgba(49, 169, 199, 0.35)' : 'none',
          fontFamily: 'var(--mincho, "Shippori Mincho", serif)',
          fontSize: 13,
          letterSpacing: '0.06em',
          boxShadow: visible ? '0 16px 40px rgba(0, 0, 0, 0.5)' : 'none',
          zIndex: 100,
          pointerEvents: 'none',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        {current?.msg ?? ''}
      </div>
    </ToastContext.Provider>
  );
}
