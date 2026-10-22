import { Button } from '@alfalab/core-components/button/modern';
import { useEffect, useId, useState } from 'react';

import { isApiError } from '../../api/ApiError';
import {
  COMPANY_SEARCH_MIN,
  useCompanySearch,
  useSubmitJoinRequest,
} from '../../api/hooks/companies';
import type { UserRole } from '../../schemas/user';
import { AuthField } from '../auth/AuthField';
import styles from './ConnectCompany.module.css';

const DEBOUNCE_MS = 300;

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

/** Поиск своей компании по названию, ID или ИНН и заявка в неё. */
export function JoinCompanySearch({ position }: { position: UserRole }) {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query);
  const search = useCompanySearch(debounced);
  const submit = useSubmitJoinRequest();
  const headingId = useId();
  const tooShort = debounced.trim().length < COMPANY_SEARCH_MIN;
  const results = tooShort ? [] : (search.data ?? []);

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        Найти компанию
      </h2>
      <AuthField
        label="Название, ID или ИНН"
        autoComplete="off"
        value={query}
        onChange={setQuery}
        hint={`От ${String(COMPANY_SEARCH_MIN)} символов`}
      />
      <p className={styles.muted} role="status">
        {tooShort
          ? ''
          : search.isError
            ? 'Не удалось выполнить поиск. Попробуйте ещё раз'
            : search.isFetching && !search.data
              ? 'Ищем…'
              : results.length === 0
                ? 'Ничего не нашлось. Проверьте название или ИНН — или создайте компанию ниже'
                : ''}
      </p>
      {results.length > 0 ? (
        <ul className={styles.results} aria-label="Найденные компании">
          {results.map((company) => (
            <li key={company.id} className={styles.result}>
              <span className={styles.resultText}>
                <span className={styles.resultName}>{company.name}</span>
                <span className={styles.muted}>
                  {company.inn ? `ИНН ${company.inn}` : company.id}
                </span>
              </span>
              <Button
                view="secondary"
                size={40}
                loading={submit.isPending && submit.variables.companyId === company.id}
                disabled={submit.isPending}
                aria-label={`Подать заявку в «${company.name}»`}
                onClick={() => {
                  submit.mutate({ companyId: company.id, body: { position } });
                }}
              >
                Подать заявку
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {submit.isError ? (
        <p className={styles.error} role="alert">
          {isApiError(submit.error) ? submit.error.message : 'Не удалось отправить заявку'}
        </p>
      ) : null}
    </section>
  );
}
