import { Link, useLocation, useNavigate } from 'react-router';

import type { Insight } from '../../../schemas/insight';
import { eventStageLabels, insightKindLabels, terms } from '../../../shared/labels';
import { readFeedReturn } from '../../../shared/lib/feedReturn';
import { InsightLabels } from '../../../shared/ui/InsightLabels';
import { PageTitle } from '../../../shared/ui/PageTitle';
import { RelativeTime } from '../../../shared/ui/RelativeTime';
import styles from './InsightHeader.module.css';

/**
 * «Лента» в крошках: если пришли из ленты — шаг назад по истории, чтобы вернулись фильтры
 * и позиция прокрутки. В href — адрес ленты с фильтрами для «открыть в новой вкладке».
 */
function FeedCrumb() {
  const location = useLocation();
  const navigate = useNavigate();
  const from = readFeedReturn(location.state);

  return (
    <Link
      to={`/${from?.feedSearch ?? ''}`}
      onClick={(event) => {
        const plainClick =
          event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey;
        if (from && plainClick) {
          event.preventDefault();
          void navigate(-1);
        }
      }}
    >
      {terms.feed}
    </Link>
  );
}

export function InsightHeader({ insight }: { insight: Insight }) {
  return (
    <header className={styles.header}>
      <nav aria-label="Хлебные крошки">
        <ol className={styles.crumbs}>
          <li>
            <FeedCrumb />
          </li>
          <li aria-current="page">{insightKindLabels[insight.kind]}</li>
        </ol>
      </nav>
      <PageTitle>{insight.title}</PageTitle>
      <div className={styles.meta}>
        <InsightLabels insight={insight} />
        <span>{eventStageLabels[insight.event.stage]}</span>
        <span aria-hidden="true">·</span>
        <span className={styles.dates}>
          Опубликовано <RelativeTime iso={insight.createdAt} /> · обновлено{' '}
          <RelativeTime iso={insight.updatedAt} />
        </span>
      </div>
    </header>
  );
}
