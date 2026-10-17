import { Link } from 'react-router';

import { useInsightFeed } from '../../api/hooks/insights';
import { insightKindLabels, urgencyLabels } from '../../shared/labels';
import { ButtonLink } from '../../shared/ui/ButtonLink';
import { EmptyState } from '../../shared/ui/EmptyState';
import { QueryView } from '../../shared/ui/QueryView';
import { PageSkeleton } from '../../shared/ui/Skeleton/PageSkeleton';
import styles from './FeedPreview.module.css';

const NO_FILTERS = {};

/** Временный список ленты для проверки оболочки. Полноценная лента — в шаге 4. */
export function FeedPreview({ companyId }: { companyId: string }) {
  const feed = useInsightFeed(companyId, NO_FILTERS);
  return (
    <QueryView
      query={{ ...feed, data: feed.data?.pages.flatMap((page) => page.items) }}
      skeleton={<PageSkeleton blocks={4} />}
      errorTitle="Не удалось загрузить ленту"
      isEmpty={(items) => items.length === 0}
      empty={
        <EmptyState
          title="Пока ничего важного"
          description="Уточните профиль компании — лента станет точнее."
          action={
            <ButtonLink to="/company" view="secondary" size={40}>
              Уточнить профиль
            </ButtonLink>
          }
        />
      }
    >
      {(items) => (
        <ul className={styles.list}>
          {items.map((insight) => (
            <li key={insight.id}>
              <Link to={`/insights/${insight.id}`} className={styles.link}>
                <span className={styles.meta}>
                  {insightKindLabels[insight.kind]} · {urgencyLabels[insight.urgency]}
                </span>
                <span className={styles.title}>{insight.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </QueryView>
  );
}
