import { Button } from '@alfalab/core-components/button/modern';
import { Textarea } from '@alfalab/core-components/textarea/modern';
import { useCallback, useId, useRef, useState } from 'react';

import styles from './FactList.module.css';

const STATEMENT_LIMIT = 500;

interface FactEditorProps {
  initial: string;
  saving: boolean;
  /** Возвращает true, если правка сохранена. */
  onSave: (statement: string) => Promise<boolean>;
  onCancel: () => void;
}

/** Правка формулировки на месте: Enter — сохранить, Shift+Enter — новая строка, Esc — отменить. */
export function FactEditor({ initial, saving, onSave, onCancel }: FactEditorProps) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  const errorId = useId();
  const focused = useRef(false);

  /**
   * Редактор открыт по «Исправить» — фокус сразу в поле. Через ref-колбэк, а не эффект:
   * Textarea из библиотеки пересоздаёт поле, когда определит тип устройства, и фокус нужно
   * перенести на новый узел — если пользователь не успел перейти к другому элементу.
   */
  const focusField = useCallback((node: HTMLTextAreaElement | null) => {
    if (!node) return;
    const active = document.activeElement;
    if (!focused.current || !active || active === document.body || !active.isConnected) {
      focused.current = true;
      node.focus();
    }
  }, []);

  const save = async () => {
    const statement = value.trim();
    if (statement === '') {
      setError('Формулировка не может быть пустой');
      return;
    }
    if (statement === initial) {
      onCancel();
      return;
    }
    if (await onSave(statement)) {
      onCancel();
    }
  };

  return (
    <form
      className={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label htmlFor={fieldId} className={styles.editorLabel}>
        Формулировка факта
      </label>
      <Textarea
        ref={focusField}
        id={fieldId}
        block
        minRows={2}
        maxLength={STATEMENT_LIMIT}
        value={value}
        disabled={saving}
        error={error ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(_, { value: next }) => {
          setValue(next);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          } else if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void save();
          }
        }}
      />
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button type="submit" view="secondary" size={32} loading={saving}>
          Сохранить
        </Button>
        <Button view="transparent" size={32} disabled={saving} onClick={onCancel}>
          Отменить
        </Button>
      </div>
    </form>
  );
}
