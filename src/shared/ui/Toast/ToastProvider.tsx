import { Button } from '@alfalab/core-components/button/modern';
import { ToastPlate } from '@alfalab/core-components/toast-plate/modern';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import styles from './ToastProvider.module.css';
import { type ShowToast, ToastContext, type ToastMessage } from './toastContext';

/** Уведомление исчезает само через 5 секунд (пункт 9.9 ТЗ). */
const AUTO_CLOSE_MS = 5000;

/**
 * Одно уведомление внизу по центру за раз: новое заменяет предыдущее.
 * Пока курсор или фокус на кнопке действия, таймер стоит — успеваете нажать «Отменить».
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<(ToastMessage & { key: number }) | null>(null);
  const [paused, setPaused] = useState(false);

  const show = useCallback<ShowToast>((next) => {
    setMessage({ ...next, key: Date.now() });
  }, []);
  const close = useCallback(() => {
    setMessage(null);
    setPaused(false);
  }, []);
  const value = useMemo(() => ({ show }), [show]);

  useEffect(() => {
    if (!message || paused) return undefined;
    const timer = setTimeout(close, AUTO_CLOSE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [message, paused, close]);

  const pause = () => {
    setPaused(true);
  };
  const resume = () => {
    setPaused(false);
  };

  return (
    <ToastContext value={value}>
      {children}
      <div className={styles.viewport}>
        {/* Живая область есть в DOM всегда — так скринридер надёжно озвучит «Скрыто». */}
        <div role="status" aria-live="polite">
          {message ? (
            <ToastPlate
              key={message.key}
              className={styles.plate}
              // Озвучивает внешняя область status; своя assertive-область плашки отключена.
              role="group"
              aria-live="off"
              title={message.title}
              actionButton={
                message.action ? (
                  <Button
                    view="transparent"
                    colors="inverted"
                    size={32}
                    onMouseEnter={pause}
                    onMouseLeave={resume}
                    onFocus={pause}
                    onBlur={resume}
                    onClick={() => {
                      message.action?.onClick();
                      close();
                    }}
                  >
                    {message.action.label}
                  </Button>
                ) : undefined
              }
            />
          ) : null}
        </div>
      </div>
    </ToastContext>
  );
}
