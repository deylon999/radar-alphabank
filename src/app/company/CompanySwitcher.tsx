import { Skeleton } from '@alfalab/core-components/skeleton/modern';
import { ChevronDownMIcon } from '@alfalab/icons-glyph/ChevronDownMIcon';
import { useMatch, useNavigate } from 'react-router';

import styles from './CompanySwitcher.module.css';
import { useCompanySelection } from './selectedCompanyContext';

/**
 * Переключатель компании для демо. Со страницы инсайта уводит в ленту новой компании.
 * Компактный, как в шапке банковского кабинета: название и стрелка, без заливки поля.
 * Под надписью — невидимый нативный <select>: доступен с клавиатуры и скринридером,
 * на телефоне открывает системный выбор.
 */
export function CompanySwitcher() {
  const selection = useCompanySelection();
  const insightMatch = useMatch('/insights/:insightId');
  const navigate = useNavigate();

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
          selection.selectCompany(event.target.value);
          if (insightMatch) {
            void navigate('/');
          }
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
