import type { QualityMetrics } from '../../schemas/quality';
import { pluralForms } from '../../shared/labels';
import { pluralize } from '../../shared/lib/plural';
import styles from './Quality.module.css';

const ROWS = [
  ['withBankView', 'С позицией банка на свежем материале'],
  ['withSignals', 'С признаками компании, на которых построен вывод'],
  ['withSelfCheck', 'С самопроверкой агента в шагах'],
  ['withChecks', 'С шагами «Что проверить»'],
] as const;

/** Доля выводов, где есть каждая из обязательных частей. Полоса дублирует подпись. */
export function Completeness({ metrics }: { metrics: QualityMetrics }) {
  const { insights, completeness } = metrics;

  return (
    <section className={styles.section} aria-labelledby="quality-completeness">
      <h2 id="quality-completeness" className={styles.sectionTitle}>
        Полнота выводов
      </h2>
      <ul className={styles.meters}>
        {ROWS.map(([key, label]) => {
          const value = completeness[key];
          return (
            <li key={key} className={styles.meter}>
              <span className={styles.meterLabel}>{label}</span>
              <span className={styles.meterValue}>
                {value} из {pluralize(insights, pluralForms.ofInsights)}
              </span>
              <span className={styles.meterTrack} aria-hidden="true">
                <span
                  className={styles.meterFill}
                  style={{ width: `${String(insights > 0 ? (value / insights) * 100 : 0)}%` }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      {completeness.outdatedBankView > 0 ? (
        <p className={styles.muted}>
          На устаревшем материале банка —{' '}
          {pluralize(completeness.outdatedBankView, pluralForms.insightOne)}: в карточке об этом
          предупреждение.
        </p>
      ) : null}
    </section>
  );
}
