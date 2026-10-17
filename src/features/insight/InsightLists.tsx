import { ArrowRightUpSIcon } from '@alfalab/icons-glyph/ArrowRightUpSIcon';

import type { Insight } from '../../schemas/insight';
import { terms } from '../../shared/labels';
import { formatFullDate } from '../../shared/lib/date';
import { RelativeTime } from '../../shared/ui/RelativeTime';
import { VisuallyHidden } from '../../shared/ui/VisuallyHidden/VisuallyHidden';
import styles from './InsightLists.module.css';
import { InsightSection } from './InsightSection/InsightSection';
import sectionStyles from './InsightSection/InsightSection.module.css';

export function Unknowns({ insight }: { insight: Insight }) {
  return (
    <InsightSection title={terms.unknowns}>
      {insight.unknowns.length > 0 ? (
        <ul className={styles.bullets}>
          {insight.unknowns.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className={sectionStyles.muted}>Неизвестных обстоятельств не осталось.</p>
      )}
    </InsightSection>
  );
}

/** Источники: издатель, дата, заголовок-ссылка в новой вкладке. Без превью-картинок. */
export function Sources({ insight }: { insight: Insight }) {
  return (
    <InsightSection title={terms.sources}>
      <ul className={sectionStyles.list}>
        {insight.sources.map((source) => (
          <li key={source.id} className={styles.source}>
            <span className={sectionStyles.muted}>
              {source.publisher} · <RelativeTime iso={source.publishedAt} />
            </span>
            <a href={source.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
              {source.title}
              <ArrowRightUpSIcon aria-hidden="true" className={styles.external} />
              <VisuallyHidden> (откроется в новой вкладке)</VisuallyHidden>
            </a>
          </li>
        ))}
      </ul>
    </InsightSection>
  );
}

/** История пересмотров — сначала новые. */
export function RevisionHistory({ insight }: { insight: Insight }) {
  const revisions = [...insight.revisions].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return (
    <InsightSection title={terms.history}>
      {revisions.length > 0 ? (
        <ol className={sectionStyles.list}>
          {revisions.map((revision) => (
            <li key={`${revision.at}-${revision.note}`} className={styles.revision}>
              <time dateTime={revision.at} className={sectionStyles.muted}>
                {formatFullDate(revision.at)}
              </time>
              <span>{revision.note}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={sectionStyles.muted}>Инсайт не пересматривался.</p>
      )}
    </InsightSection>
  );
}
