import { createContext, useContext } from 'react';

export interface ToastMessage {
  /** «Скрыто», «Сохранено». */
  title: string;
  /** Например, «Отменить» для «Скрыто». */
  action?: { label: string; onClick: () => void };
}

export type ShowToast = (message: ToastMessage) => void;

export const ToastContext = createContext<{ show: ShowToast } | null>(null);

export function useToast(): ShowToast {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast используется вне ToastProvider');
  }
  return context.show;
}
