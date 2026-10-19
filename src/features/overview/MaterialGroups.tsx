import type { Overview } from '../../schemas/insight';
import { pluralForms, terms } from '../../shared/labels';
import { formatLongDate } from '../../shared/lib/date';
import { pluralize } from '../../shared/lib/plural';
import { Badge } from '../../shared/ui/Badge/Badge';
import { InsightRow } from './InsightRow';
import styles from './Overview.module.css';

/** Выводы, сгруппированные по аналитическим материалам банка, на которые они опираются. */
export function MaterialGroups({ materials }: { materials: Overview['materials'] }) {
  return (
    <div className={styles.groups}>
      <p className={styles.note}>
        Позиция банка в выводах — выжимки из этих материалов аналитиков Альфа-Банка. Видно, на какой
        обзор опирается каждая оценка и насколько он свежий.
      </p>
      {materials.map(({ material, insights }) => {
        const headingId = `material-${material.id}`;
        return (
          <section key={material.id} className={styles.group} aria-labelledby={headingId}>
            <div className={styles.groupHead}>
              <h2 id={headingId} className={styles.groupTitle}>
                {material.title}
              </h2>
              <p className={styles.groupMeta}>
                {formatLongDate(material.publishedAt)} · учтён в{' '}
                {pluralize(insights.length, pluralForms.insightIn)}
                {material.outdated ? (
                  <>
                    {' '}
                    <Badge tone="quiet">{terms.materialOutdated}</Badge>
                  </>
                ) : null}
              </p>
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
