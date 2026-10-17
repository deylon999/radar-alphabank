import { Button } from '@alfalab/core-components/button/modern';
import { Skeleton } from '@alfalab/core-components/skeleton/modern';

import { useDigest } from '../../../api/hooks/insights';
import type { Digest } from '../../../schemas/insight';
import { pluralForms } from '../../../shared/labels';
import { formatDayMonth } from '../../../shared/lib/date';
import { pluralize } from '../../../shared/lib/plural';
import type { FeedParams } from '../feedParams';
import styles from './DigestBar.module.css';

type DigestFilter = Pick<FeedParams, 'kind' | 'urgency'>;

interface DigestBarProps {
  companyId: string;
  /** Клик по части сводки включает соответствующий фильтр на вкладке «Главное». */
  onSelect: (filter: DigestFilter) => void;
}

function digestParts(digest: Digest): { label: string; count: number; filter: DigestFilter }[] {
  return [
    {
      label: pluralize(digest.urgentRisks, pluralForms.urgentRisk),
      count: digest.urgentRisks,
      filter: { kind: ['risk'], urgency: ['urgent'] },
    },
    {
      label: pluralize(digest.risks, pluralForms.risk),
      count: digest.risks,
      filter: { kind: ['risk'], urgency: [] },
    },
    {
      label: pluralize(digest.opportunities, pluralForms.opportunity),
      count: digest.opportunities,
      filter: { kind: ['opportunity'], urgency: [] },
    },
  ];
}

/** Сводка одной строкой: «С 11 октября: 1 срочный риск · 6 рисков · 4 возможности». */
export function DigestBar({ companyId, onSelect }: DigestBarProps) {
  const digest = useDigest(companyId);

  if (!digest.data) {
    return (
      <div className={styles.bar} aria-busy={!digest.isError}>
        {digest.isError ? (
          <span role="alert" className={styles.error}>
            Не удалось загрузить сводку.{' '}
            <Button view="text" size={32} onClick={() => void digest.refetch()}>
              Повторить
            </Button>
          </span>
        ) : (
          <Skeleton visible animate={false} borderRadius={4} className={styles.skeleton} />
        )}
      </div>
    );
  }

  const since = formatDayMonth(digest.data.since);
  const parts = digestParts(digest.data);
  if (parts.every((part) => part.count === 0)) {
    return <p className={styles.bar}>С {since} новых событий нет</p>;
  }

  return (
    <p className={styles.bar}>
      <span className={styles.since}>С {since}:</span>
      {parts.map((part, index) => (
        <span key={part.label} className={styles.part}>
          {part.count > 0 ? (
            <button
              type="button"
              className={styles.link}
              onClick={() => {
                onSelect(part.filter);
              }}
            >
              {part.label}
            </button>
          ) : (
            part.label
          )}
          {/* Разделитель остаётся в конце строки при переносе, а не в начале следующей. */}
          {index < parts.length - 1 ? <span aria-hidden="true"> ·</span> : null}
        </span>
      ))}
    </p>
  );
}
