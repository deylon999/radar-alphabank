import { IconButton } from '@alfalab/core-components/icon-button/modern';
import { Input } from '@alfalab/core-components/input/modern';
import { CrossCircleMIcon } from '@alfalab/icons-glyph/CrossCircleMIcon';
import { MagnifierMIcon } from '@alfalab/icons-glyph/MagnifierMIcon';
import { type SVGProps, useEffect, useId, useRef, useState } from 'react';

import styles from './FeedFilters.module.css';

const DEBOUNCE_MS = 300;

/** Иконка декоративная: доступное имя есть у самой кнопки. */
function ClearIcon(props: SVGProps<SVGSVGElement>) {
  return <CrossCircleMIcon {...props} aria-hidden="true" />;
}

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/** Поиск по ленте: адрес обновляется через 300 мс после последнего ввода. */
export function SearchField({ value, onChange }: SearchFieldProps) {
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputId = useId();

  // Значение из адреса поменялось снаружи (например, «Сбросить») — показываем его.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  const commit = (next: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange(next);
    }, DEBOUNCE_MS);
  };

  return (
    <div role="search">
      {/* Своя подпись вместо подписи поля: тот же размер, что у групп фильтров. */}
      <label htmlFor={inputId} className={styles.legend}>
        Поиск по ленте
      </label>
      <Input
        id={inputId}
        size={40}
        block
        placeholder="Склад, поставщик, регион"
        leftAddons={<MagnifierMIcon aria-hidden="true" />}
        value={draft}
        onChange={(_, { value: next }) => {
          setDraft(next);
          commit(next);
        }}
        // Своя кнопка очистки вместо `clear`: у встроенной иконка без подписи (axe)
        // и tabIndex=-1 — с клавиатуры до неё не добраться.
        rightAddons={
          draft ? (
            <IconButton
              icon={ClearIcon}
              size={24}
              aria-label="Очистить поиск"
              onClick={() => {
                setDraft('');
                clearTimeout(timer.current);
                onChange('');
              }}
            />
          ) : null
        }
      />
    </div>
  );
}
