import { Skeleton } from '@alfalab/core-components/skeleton/modern';
import { useMatch, useNavigate } from 'react-router';

import type { Company } from '../../schemas/company';
import { ClientPicker } from './ClientPicker';
import styles from './CompanySwitcher.module.css';
import { useCompanySelection } from './selectedCompanyContext';

/**
 * Переключатель клиента в шапке: компактная кнопка с названием, как в банковском кабинете,
 * и панель с поиском. Со страницы инсайта уводит в ленту нового клиента.
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

  const select = (company: Company) => {
    selection.selectCompany(company);
    if (insightMatch) {
      void navigate('/');
    }
  };

  return <ClientPicker company={selection.company} onSelect={select} />;
}
