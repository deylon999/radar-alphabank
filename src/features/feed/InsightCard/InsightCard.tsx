import { Link as ActionLink } from '@alfalab/core-components/link/modern';
import cn from 'classnames';
import { useId } from 'react';
import { Link } from 'react-router';

import type { Insight } from '../../../schemas/insight';
import { eventStageLabels, pluralForms, terms } from '../../../shared/labels';
import { pluralize } from '../../../shared/lib/plural';
import { RelativeTime } from '../../../shared/ui/RelativeTime';
import styles from './InsightCard.module.css';
import { InsightLabels } from './InsightLabels';

interface InsightCardProps {
  insight: Insight;
  onHide: (insight: Insight) => void;
}

/** Цепочка без последнего шага: «ваша компания» и так понятна из контекста ленты. */
export function shortImpactPath(insight: Insight): string {
  return insight.impactPath
    .filter((step) => step.role !== 'company')
    .map((step) => step.label)
    .join(' → ');
}

/** Карточка ленты: суть за 5 секунд. Вся карточка — одна ссылка на инсайт. */
export function InsightCard({ insight, onHide }: InsightCardProps) {
  const titleId = useId();
  const chain = shortImpactPath(insight);
  const isUrgentRisk = insight.kind === 'risk' && insight.urgency === 'urgent';

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        styles.card,
        isUrgentRisk && styles.urgentRisk,
        insight.kind === 'opportunity' && styles.opportunity,
      )}
    >
      <div className={styles.top}>
        <InsightLabels insight={insight} />
        <span className={styles.stage}>{eventStageLabels[insight.event.stage]}</span>
        <RelativeTime iso={insight.updatedAt} className={styles.time} />
      </div>
      <h2 className={styles.title} id={titleId}>
        <Link to={`/insights/${insight.id}`} className={styles.link} data-card-link="">
          {insight.title}
        </Link>
      </h2>
      <p className={styles.why} title={insight.whyItMatters}>
        {insight.whyItMatters}
      </p>
      <p className={styles.chain} title={chain}>
        {chain}
      </p>
      <div className={styles.bottom}>
        <span>{pluralize(insight.sources.length, pluralForms.source)}</span>
        {insight.status === 'new' ? <span className={styles.new}>{terms.newBadge}</span> : null}
        <ActionLink
          pseudo
          view="secondary"
          className={styles.hide}
          aria-label={`Скрыть: ${insight.title}`}
          onClick={() => {
            onHide(insight);
          }}
        >
          Скрыть
        </ActionLink>
      </div>
    </article>
  );
}
