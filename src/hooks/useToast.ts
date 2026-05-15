import { useContext } from 'react';
import { ToastContext } from '~/components/ui/toastContext';

/**
 * Access the global Toast queue. Must be called inside a <ToastProvider>
 * subtree — throws otherwise so the missing setup is loud, not silent.
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}
