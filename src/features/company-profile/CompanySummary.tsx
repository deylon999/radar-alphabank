import { Typography } from '@alfalab/core-components/typography/modern';

import type { Company } from '../../schemas/company';
import { NBSP } from '../../shared/lib/typography';
import styles from './CompanySummary.module.css';

/** Шапка профиля: название, ИНН, отрасль, описание. */
export function CompanySummary({ company }: { company: Company }) {
  return (
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
  );
}
