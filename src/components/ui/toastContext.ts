import { createContext } from 'react';

export interface ToastApi {
  show: (msg: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
