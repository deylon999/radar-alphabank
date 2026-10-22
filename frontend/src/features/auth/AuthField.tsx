import { Input } from '@alfalab/core-components/input/modern';
import { useEffect, useId } from 'react';

import { useMediaQuery } from '../../shared/lib/useMediaQuery';
import styles from './Auth.module.css';

interface AuthFieldProps {
  label: string;
  type?: 'email' | 'password' | 'text';
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  /** Ошибка поля от сервера — показывается под полем и связана с ним для скринридера. */
  error?: string;
  hint?: string;
  inputMode?: 'numeric' | 'text' | 'email';
  /** Поле появилось после шага формы (ввод кода) — фокус сразу в него. */
  focusOnMount?: boolean;
}

/** Своя подпись: подпись Input из библиотеки не связана с полем для скринридера. */
export function AuthField({
  label,
  type = 'text',
  autoComplete,
  value,
  onChange,
  error,
  hint,
  inputMode,
  focusOnMount = false,
}: AuthFieldProps) {
  const id = useId();
  // Input библиотеки сам выбирает мобильную или десктопную версию уже после первой отрисовки
  // и при этом пересоздаёт поле — фокус теряется. Даём версию сразу.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  useEffect(() => {
    if (focusOnMount) document.getElementById(id)?.focus();
  }, [focusOnMount, id]);
  const noteId = `${id}-note`;
  const note = error ?? hint;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <Input
        id={id}
        type={type}
        size={48}
        block
        client={isDesktop ? 'desktop' : 'mobile'}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        onChange={(_, { value: next }) => {
          onChange(next);
        }}
      />
      {note ? (
        <p id={noteId} className={error ? styles.fieldError : styles.hint}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
