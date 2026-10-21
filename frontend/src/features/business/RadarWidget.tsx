import { Link } from 'react-router';

import { useDigest, useInsightFeed } from '../../api/hooks/insights';
import { pluralForms, terms } from '../../shared/labels';
import { formatDayMonth } from '../../shared/lib/date';
import { pluralize } from '../../shared/lib/plural';
import { ButtonLink } from '../../shared/ui/ButtonLink';
import { InsightLabels } from '../../shared/ui/InsightLabels';
import styles from './RadarWidget.module.css';

/**
 * Точка входа в Радар на главной Альфа-Бизнеса: сводка за неделю, самый срочный инсайт
 * и кнопка в сервис. Виджет заметный и стоит первым — по требованию кейса.
 */
export function RadarWidget({ companyId }: { companyId: string }) {
  const digest = useDigest(companyId);
  const urgent = useInsightFeed(companyId, { urgency: ['urgent'], relevance: 'direct' });
  const top = urgent.data?.pages[0]?.items[0];

  return (
    <section aria-labelledby="radar-widget-title" className={styles.widget}>
      <div className={styles.head}>
        <h2 id="radar-widget-title" className={styles.title}>
          {terms.productName}
        </h2>
        <p className={styles.lead}>
          Новости, которые касаются вашей компании, с оценкой Альфа-Банка
        </p>
      </div>
      {digest.data ? (
        <p className={styles.digest}>
          С {formatDayMonth(digest.data.since)}:{' '}
          {pluralize(digest.data.urgentRisks, pluralForms.urgentRisk)} ·{' '}
          {pluralize(digest.data.risks, pluralForms.risk)} ·{' '}
          {pluralize(digest.data.opportunities, pluralForms.opportunity)}
        </p>
      ) : null}
      {top ? (
        <article aria-labelledby="radar-widget-top" className={styles.top}>
          <div className={styles.labels}>
            <InsightLabels insight={top} />
          </div>
          <h3 id="radar-widget-top" className={styles.topTitle}>
            <Link to={`/insights/${top.id}`} className={styles.link}>
              {top.title}
            </Link>
          </h3>
          <p className={styles.why}>{top.whyItMatters}</p>
        </article>
      ) : null}
      <div>
        <ButtonLink to="/" view="primary" size={40}>
          Открыть Радар
        </ButtonLink>
      </div>
    </section>
  );
}
