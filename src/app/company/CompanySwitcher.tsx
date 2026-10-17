import { Skeleton } from '@alfalab/core-components/skeleton/modern';
import { useMatch, useNavigate } from 'react-router';

import { NativeSelectField } from '../../shared/ui/NativeSelectField/NativeSelectField';
import styles from './CompanySwitcher.module.css';
import { useCompanySelection } from './selectedCompanyContext';

/** Переключатель компании для демо. Со страницы инсайта уводит в ленту новой компании. */
export function CompanySwitcher() {
  const selection = useCompanySelection();
  const insightMatch = useMatch('/insights/:insightId');
  const navigate = useNavigate();

  if (selection.status !== 'ready') {
    return (
      <Skeleton
        visible={selection.status === 'loading'}
        animate={false}
        borderRadius={12}
        className={styles.root}
      />
    );
  }

  return (
    <NativeSelectField
      className={styles.root}
      label="Компания"
      value={selection.company.id}
      options={selection.companies.map((company) => ({ value: company.id, label: company.name }))}
      onChange={(companyId) => {
        selection.selectCompany(companyId);
        if (insightMatch) {
          void navigate('/');
        }
      }}
    />
  );
}
