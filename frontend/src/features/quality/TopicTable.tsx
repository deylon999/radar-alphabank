import type { QualityMetrics } from '../../schemas/quality';
import { pluralForms, topicLabels } from '../../shared/labels';
import { pluralize } from '../../shared/lib/plural';
import { percent } from './format';
import styles from './Quality.module.css';

/** Отзывы и скрытия по темам: где выводы чаще не попадают. */
export function TopicTable({ topics }: { topics: QualityMetrics['topics'] }) {
  return (
    <section className={styles.section} aria-labelledby="quality-topics">
      <h2 id="quality-topics" className={styles.sectionTitle}>
        По темам
      </h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Тема</th>
            <th scope="col">Полезно</th>
            <th scope="col">Не полезно</th>
            <th scope="col">Скрыто</th>
          </tr>
        </thead>
        <tbody>
          {topics.map((row) => (
            <tr key={row.topic}>
              <th scope="row">
                {topicLabels[row.topic]}
                <span className={styles.share}>
                  {pluralize(row.insights, pluralForms.insightOne)}
                </span>
              </th>
              <td>
                {row.useful}
                <span className={styles.share}>
                  {percent(row.useful, row.useful + row.notUseful)}
                </span>
              </td>
              <td>{row.notUseful}</td>
              <td>{row.dismissed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
