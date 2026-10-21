import type { InsightBrief, Overview } from '../../schemas/insight';
import { pluralForms, topicLabels } from '../../shared/labels';
import { pluralize } from '../../shared/lib/plural';
import { InsightRow } from './InsightRow';
import styles from './Overview.module.css';

interface TopicCounts {
  urgent: number;
  risks: number;
  opportunities: number;
}

function countTopic(insights: readonly InsightBrief[]): TopicCounts {
  const risks = insights.filter((insight) => insight.kind === 'risk');
  return {
    urgent: risks.filter((insight) => insight.urgency === 'urgent').length,
    risks: risks.length,
    opportunities: insights.length - risks.length,
  };
}

/** «2 риска, из них 1 срочный · 1 возможность». */
export function topicSummary({ urgent, risks, opportunities }: TopicCounts): string {
  const parts: string[] = [];
  if (risks > 0) {
    parts.push(
      urgent > 0
        ? `${pluralize(risks, pluralForms.risk)}, из них ${pluralize(urgent, pluralForms.urgent)}`
        : pluralize(risks, pluralForms.risk),
    );
  }
  if (opportunities > 0) {
    parts.push(pluralize(opportunities, pluralForms.opportunity));
  }
  return parts.join(' · ');
}

/**
 * Полоса темы: длина — сколько выводов относительно самой большой темы, сегменты — срочные
 * риски, остальные риски и возможности. Смысл дублирует подпись, поэтому полоса скрыта
 * от скринридеров.
 */
function TopicBar({ counts, scale }: { counts: TopicCounts; scale: number }) {
  const total = counts.risks + counts.opportunities;
  const segments = [
    [styles.barUrgent, counts.urgent],
    [styles.barRisk, counts.risks - counts.urgent],
    [styles.barOpportunity, counts.opportunities],
  ] as const;

  return (
    <div className={styles.bar} aria-hidden="true">
      <div className={styles.barFill} style={{ width: `${String((total / scale) * 100)}%` }}>
        {segments.map(([className, count]) =>
          count > 0 ? (
            <span key={className} className={className} style={{ flexGrow: count }} />
          ) : null,
        )}
      </div>
    </div>
  );
}

export function TopicGroups({ topics }: { topics: Overview['topics'] }) {
  const scale = Math.max(...topics.map((group) => group.insights.length));

  return (
    <div className={styles.groups}>
      <ul className={styles.legend} aria-hidden="true">
        <li className={styles.legendUrgent}>Срочный риск</li>
        <li className={styles.legendRisk}>Риск</li>
        <li className={styles.legendOpportunity}>Возможность</li>
      </ul>
      {topics.map(({ topic, insights }) => {
        const counts = countTopic(insights);
        const headingId = `topic-${topic}`;
        return (
          <section key={topic} className={styles.group} aria-labelledby={headingId}>
            <div className={styles.groupHead}>
              <h2 id={headingId} className={styles.groupTitle}>
                {topicLabels[topic]}
              </h2>
              <p className={styles.groupMeta}>{topicSummary(counts)}</p>
              <TopicBar counts={counts} scale={scale} />
            </div>
            <ul className={styles.rows}>
              {insights.map((insight) => (
                <InsightRow key={insight.id} insight={insight} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
