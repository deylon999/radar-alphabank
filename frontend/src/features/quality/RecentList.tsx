import { Link } from 'react-router';

import type { QualityMetrics } from '../../schemas/quality';
import { Badge } from '../../shared/ui/Badge/Badge';
import { RelativeTime } from '../../shared/ui/RelativeTime';
import styles from './Quality.module.css';

interface Item {
  key: string;
  text: string;
  insightId: string;
  insightTitle: string;
  at: string;
  useful?: boolean;
}

interface RecentListProps {
  id: string;
  title: string;
  empty: string;
  items: Item[];
}

function RecentList({ id, title, empty, items }: RecentListProps) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {items.length === 0 ? (
        <p className={styles.muted}>{empty}</p>
      ) : (
        <ul className={styles.recent}>
          {items.map((item) => (
            <li key={item.key} className={styles.recentItem}>
              <p className={styles.recentText}>«{item.text}»</p>
              <div className={styles.recentMeta}>
                {item.useful === undefined ? null : (
                  <Badge tone={item.useful ? 'positive' : 'neutral'}>
                    {item.useful ? 'Полезно' : 'Не полезно'}
                  </Badge>
                )}
                <Link to={`/insights/${item.insightId}`} className={styles.recentLink}>
                  {item.insightTitle}
                </Link>
                <RelativeTime iso={item.at} className={styles.recentTime} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Comments({ comments }: { comments: QualityMetrics['feedback']['comments'] }) {
  return (
    <RecentList
      id="quality-comments"
      title="Что пишут в отзывах"
      empty="Комментариев пока нет."
      items={comments.map((entry) => ({
        ...entry,
        key: `${entry.insightId}-${entry.at}`,
        text: entry.comment,
      }))}
    />
  );
}

export function Questions({ questions }: { questions: QualityMetrics['questions'] }) {
  return (
    <RecentList
      id="quality-questions"
      title="О чём спрашивают агента"
      empty="Вопросов пока нет."
      items={questions.map((entry) => ({
        ...entry,
        key: `${entry.insightId}-${entry.at}`,
        text: entry.question,
      }))}
    />
  );
}
