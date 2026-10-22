import { Skeleton } from '@alfalab/core-components/skeleton/modern';

import styles from './CompanyName.module.css';
import { useCompanySelection } from './selectedCompanyContext';

/** Компания пользователя в шапке — как название организации в банковском кабинете. */
export function CompanyName() {
  const selection = useCompanySelection();

  if (selection.status === 'ready') {
    return (
      <span className={styles.name} title={selection.company.name}>
        {selection.company.name}
      </span>
    );
  }
  return (
    <Skeleton
      visible={selection.status === 'loading'}
      animate={false}
      borderRadius={8}
      className={styles.skeleton}
    />
  );
}
