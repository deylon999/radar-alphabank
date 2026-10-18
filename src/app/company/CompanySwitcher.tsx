import { Skeleton } from '@alfalab/core-components/skeleton/modern';
import { ChevronDownMIcon } from '@alfalab/icons-glyph/ChevronDownMIcon';
import { useMatch, useNavigate } from 'react-router';

import { useMediaQuery } from '../../shared/lib/useMediaQuery';
import { CompanyMenu } from './CompanyMenu';
import styles from './CompanySwitcher.module.css';
import { useCompanySelection } from './selectedCompanyContext';

/** Мышь или тачпад: показываем своё меню. На сенсорных экранах удобнее системный выбор. */
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/**
 * Переключатель компании для демо. Со страницы инсайта уводит в ленту новой компании.
 * Компактный, как в шапке банковского кабинета: название и стрелка, без заливки поля.
 * С мышью — меню в стиле библиотеки, на телефоне — невидимый нативный <select> под
 * надписью: он открывает системный выбор и доступен скринридерам.
 */
export function CompanySwitcher() {
  const selection = useCompanySelection();
  const insightMatch = useMatch('/insights/:insightId');
  const navigate = useNavigate();
  const finePointer = useMediaQuery(FINE_POINTER);

  if (selection.status !== 'ready') {
    return (
      <Skeleton
        visible={selection.status === 'loading'}
        animate={false}
        borderRadius={8}
        className={styles.skeleton}
      />
    );
  }

  const select = (companyId: string) => {
    selection.selectCompany(companyId);
    if (insightMatch) {
      void navigate('/');
    }
  };

  if (finePointer) {
    return (
      <CompanyMenu company={selection.company} companies={selection.companies} onSelect={select} />
    );
  }

  return (
    <div className={styles.root}>
      <span className={styles.value} aria-hidden="true" title={selection.company.name}>
        {selection.company.name}
      </span>
      <ChevronDownMIcon aria-hidden="true" className={styles.chevron} />
      <select
        aria-label="Компания"
        className={styles.select}
        value={selection.company.id}
        onChange={(event) => {
          select(event.target.value);
        }}
      >
        {selection.companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
    </div>
  );
}
