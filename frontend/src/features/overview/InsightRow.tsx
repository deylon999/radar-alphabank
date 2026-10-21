import { Link, useLocation } from 'react-router';

import type { InsightBrief } from '../../schemas/insight';
import { terms } from '../../shared/labels';
import { returnState } from '../../shared/lib/returnState';
import { Badge } from '../../shared/ui/Badge/Badge';
import { InsightLabels } from '../../shared/ui/InsightLabels';
import { RelativeTime } from '../../shared/ui/RelativeTime';
import styles from './Overview.module.css';

/** Строка вывода в группе: заголовок-ссылка и метки, без подробностей ленты. */
export function InsightRow({ insight }: { insight: InsightBrief }) {
  const { search } = useLocation();

  return (
    <li className={styles.row}>
      <Link
        to={`/insights/${insight.id}`}
        state={returnState('overview', search)}
        className={styles.rowLink}
      >
        {insight.title}
      </Link>
      <div className={styles.rowMeta}>
        <InsightLabels insight={insight} />
        {insight.relevance === 'possible' ? <Badge tone="attention">{terms.watchTab}</Badge> : null}
        {insight.status === 'new' ? <span className={styles.new}>{terms.newBadge}</span> : null}
        <RelativeTime iso={insight.updatedAt} className={styles.time} />
      </div>
    </li>
  );
}
