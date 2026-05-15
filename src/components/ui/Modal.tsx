import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { useFocusTrap } from '~/hooks/useFocusTrap';

interface Props {
  /** Controlled open state. */
  open: boolean;
  /** Called on Esc, backdrop click, or close button. */
  onClose: () => void;
  /** Accessible label for the dialog (used as `aria-label`). */
  label: string;
  children: ReactNode;
  /** Override the portal target (defaults to document.body). */
  container?: HTMLElement;
}

/**
 * Accessible dialog with focus trap, Esc-to-close, backdrop click, and
 * portal rendering so it escapes any parent `overflow: hidden`.
 *
 * The backdrop has `role="presentation"` and the dialog itself has
 * `role="dialog"` + `aria-modal="true"`. Closing restores focus to the
 * previously-active element via useFocusTrap.
 */
export function Modal({ open, onClose, label, children, container }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const target = container ?? document.body;
  return createPortal(
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 3, 10, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{
          background: 'var(--ink-strong, rgba(8, 11, 22, 0.94))',
          border: '1px solid var(--hair, rgba(255, 255, 255, 0.08))',
          borderRadius: 14,
          padding: '24px 28px',
          minWidth: 320,
          maxWidth: 'min(640px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'auto',
          color: 'var(--text-0, #f4f6fb)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        {children}
      </div>
    </div>,
    target
  );
}
