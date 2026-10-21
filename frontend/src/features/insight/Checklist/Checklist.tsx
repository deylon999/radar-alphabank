import { Checkbox } from '@alfalab/core-components/checkbox/modern';

import type { Insight } from '../../../schemas/insight';
import { terms } from '../../../shared/labels';
import { InsightSection } from '../InsightSection/InsightSection';
import sectionStyles from '../InsightSection/InsightSection.module.css';
import styles from './Checklist.module.css';
import { useChecklist } from './useChecklist';

/** «Что проверить» — настоящий чек-лист со счётчиком «1 из 3». */
export function Checklist({ insight }: { insight: Insight }) {
  const { isDone, toggle, doneCount } = useChecklist(insight.id, insight.checks);
  const total = insight.checks.length;

  return (
    <InsightSection
      title={terms.checks}
      meta={
        total > 0 ? (
          <span className={styles.counter} aria-live="polite">
            {doneCount} из {total}
          </span>
        ) : null
      }
    >
      {total > 0 ? (
        <ul className={styles.list}>
          {insight.checks.map((check) => (
            <li key={check}>
              <Checkbox
                block
                size={24}
                checked={isDone(check)}
                label={check}
                onChange={(_, { checked }) => {
                  toggle(check, checked);
                }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className={sectionStyles.muted}>Проверять пока нечего.</p>
      )}
    </InsightSection>
  );
}
