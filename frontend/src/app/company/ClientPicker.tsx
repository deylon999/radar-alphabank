import { CheckmarkMIcon } from '@alfalab/icons-glyph/CheckmarkMIcon';
import { ChevronDownMIcon } from '@alfalab/icons-glyph/ChevronDownMIcon';
import { MagnifierMIcon } from '@alfalab/icons-glyph/MagnifierMIcon';
import cn from 'classnames';
import { useEffect, useId, useRef, useState } from 'react';

import { useCompanies } from '../../api/hooks/companies';
import type { Company } from '../../schemas/company';
import styles from './CompanySwitcher.module.css';

const DEBOUNCE_MS = 250;

function useDebounced(value: string): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [value]);
  return debounced;
}

interface ClientPickerProps {
  company: Company;
  onSelect: (company: Company) => void;
}

/**
 * Выбор клиента с поиском: в данных банка клиентов больше сотни, списком их не выбрать.
 * Поиск — по ID, отрасли, коду ОКВЭД и региону; без запроса показаны крупнейшие клиенты.
 * Клавиатура: стрелки между полем и клиентами, Esc закрывает и возвращает фокус на кнопку.
 */
export function ClientPicker({ company, onSelect }: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const query = useDebounced(draft);
  const results = useCompanies(query);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const inputId = useId();

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setDraft('');
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  };

  // Открытая панель: фокус в поиск; клик или фокус снаружи закрывают; стрелки и Esc.
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return undefined;
    inputRef.current?.focus();
    const dismiss = () => {
      setOpen(false);
      setDraft('');
    };
    const isOutside = (target: EventTarget | null) =>
      target instanceof Node && !rootRef.current?.contains(target);
    const onPointerDown = (event: PointerEvent) => {
      if (isOutside(event.target)) dismiss();
    };
    const onFocusIn = (event: FocusEvent) => {
      if (isOutside(event.target)) dismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      const options = [...(listRef.current?.querySelectorAll('button') ?? [])];
      const index = options.findIndex((option) => option === document.activeElement);
      const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
      if (next < 0) {
        inputRef.current?.focus();
      } else {
        options[Math.min(next, options.length - 1)]?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    panel.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      panel.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const items = results.data ?? [];
  const searching = results.isFetching && results.isPlaceholderData;

  return (
    <div ref={rootRef} className={styles.menuRoot}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(styles.root, styles.trigger)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Компания: ${company.name}`}
        title={company.name}
        onClick={() => {
          if (open) {
            close(false);
          } else {
            setOpen(true);
          }
        }}
      >
        <span className={styles.value}>{company.name}</span>
        <ChevronDownMIcon
          aria-hidden="true"
          className={cn(styles.chevron, open && styles.chevronOpen)}
        />
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Выбор клиента"
          className={styles.menu}
        >
          <div className={styles.search}>
            <label htmlFor={inputId} className={styles.searchLabel}>
              Поиск клиента
            </label>
            <div className={styles.searchField}>
              <MagnifierMIcon aria-hidden="true" className={styles.searchIcon} />
              <input
                ref={inputRef}
                id={inputId}
                type="search"
                autoComplete="off"
                className={styles.searchInput}
                placeholder="ID, отрасль или регион"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                }}
              />
            </div>
          </div>
          <p className={styles.searchStatus} role="status">
            {searching
              ? 'Ищем…'
              : results.isError
                ? 'Не удалось загрузить клиентов'
                : items.length === 0 && results.isSuccess
                  ? 'Ничего не нашлось. Попробуйте ID, код ОКВЭД или регион'
                  : ''}
          </p>
          {items.length > 0 ? (
            <ul ref={listRef} className={styles.results} aria-label="Клиенты">
              {items.map((item) => {
                const selected = item.id === company.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={styles.item}
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => {
                        close(true);
                        if (!selected) {
                          onSelect(item);
                        }
                      }}
                    >
                      <span className={styles.itemText}>
                        <span className={styles.itemName}>{item.name}</span>
                        <span className={styles.itemIndustry}>
                          {[item.industry, item.profile?.region].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      {selected ? (
                        <CheckmarkMIcon aria-hidden="true" className={styles.check} />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
