import { Typography } from '@alfalab/core-components/typography/modern';

import { useCompany } from '../../api/hooks/companies';
import { NBSP } from '../../shared/lib/typography';
import { QueryView } from '../../shared/ui/QueryView';
import { PageSkeleton } from '../../shared/ui/Skeleton/PageSkeleton';
import styles from './CompanySummary.module.css';

/** Шапка профиля: название, ИНН, отрасль, описание. Остальной профиль — в шаге 6. */
export function CompanySummary({ companyId }: { companyId: string }) {
  const query = useCompany(companyId);
  return (
    <QueryView
      query={query}
      skeleton={<PageSkeleton blocks={1} />}
      errorTitle="Не удалось загрузить профиль компании"
    >
      {(company) => (
        <section aria-label="Компания" className={styles.root}>
          <Typography.Title tag="h2" view="xsmall" className={styles.name}>
            {company.name}
          </Typography.Title>
          <Typography.Text tag="p" view="primary-small" color="secondary">
            {company.industry}
            {company.inn ? ` · ИНН${NBSP}${company.inn}` : ''}
          </Typography.Text>
          {company.description ? (
            <Typography.Text tag="p" view="primary-medium" className={styles.description}>
              {company.description}
            </Typography.Text>
          ) : null}
        </section>
      )}
    </QueryView>
  );
}
