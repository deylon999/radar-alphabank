import type { QualityMetrics } from '../../schemas/quality';
import { pluralForms } from '../../shared/labels';
import { formatDuration } from '../../shared/lib/date';
import { pluralize } from '../../shared/lib/plural';
import { NBSP } from '../../shared/lib/typography';
import { percent } from './format';
import styles from './Quality.module.css';

interface Tile {
  label: string;
  value: string;
  note: string;
}

function tiles(metrics: QualityMetrics): Tile[] {
  const { insights, engagement, feedback, reactionMinutes } = metrics;
  const votes = feedback.useful + feedback.notUseful;
  return [
    {
      label: 'Полезно',
      value: percent(feedback.useful, votes),
      note: `${String(feedback.useful)} из ${pluralize(votes, pluralForms.ofVotes)}`,
    },
    {
      label: 'Открыли',
      value: percent(engagement.read, insights),
      note: `${String(engagement.read)} из ${pluralize(insights, pluralForms.ofInsights)}`,
    },
    {
      label: 'Скрыли',
      value: percent(engagement.dismissed, insights),
      note: `${String(engagement.dismissed)} из ${pluralize(insights, pluralForms.ofInsights)}`,
    },
    {
      label: 'Вопросов агенту',
      value: String(engagement.questions),
      note: 'по карточкам выводов',
    },
    {
      label: 'Реакция',
      value: formatDuration(reactionMinutes.median),
      note: `медиана; у 90${NBSP}% — до ${formatDuration(reactionMinutes.p90)}`,
    },
  ];
}

/** Главные числа экрана: каждое — отдельная плитка с пояснением, из чего оно посчитано. */
export function StatTiles({ metrics }: { metrics: QualityMetrics }) {
  return (
    <dl className={styles.tiles}>
      {tiles(metrics).map(({ label, value, note }) => (
        <div key={label} className={styles.tile}>
          <dt className={styles.tileLabel}>{label}</dt>
          <dd className={styles.tileValue}>{value}</dd>
          <dd className={styles.tileNote}>{note}</dd>
        </div>
      ))}
    </dl>
  );
}
