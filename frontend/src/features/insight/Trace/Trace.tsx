import cn from 'classnames';

import type { Insight } from '../../../schemas/insight';
import { pluralForms, terms, traceStepKindLabels } from '../../../shared/labels';
import { pluralize } from '../../../shared/lib/plural';
import { InsightSection } from '../InsightSection/InsightSection';
import sectionStyles from '../InsightSection/InsightSection.module.css';
import styles from './Trace.module.css';

/**
 * «Как получен вывод»: шаги агента — план, какие данные он взял, что проверил и к чему
 * пришёл. Свёрнуто по умолчанию: это нужно, чтобы перепроверить, а не чтобы читать первым.
 */
export function Trace({ insight }: { insight: Insight }) {
  const steps = insight.trace ?? [];
  if (steps.length === 0) {
    return null;
  }

  return (
    <InsightSection title={terms.trace}>
      <details className={styles.details}>
        <summary className={styles.summary}>
          Показать {pluralize(steps.length, pluralForms.step)}
        </summary>
        <ol className={styles.steps}>
          {steps.map((step, index) => (
            // Шаги идут в порядке выполнения и не переставляются: индекс — устойчивый ключ.
            <li key={index} className={styles.step}>
              <span className={styles.kind}>{traceStepKindLabels[step.kind]}</span>
              <span>
                {step.title}
                {step.detail ? (
                  <span className={cn(sectionStyles.muted, styles.detail)}>{step.detail}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </InsightSection>
  );
}
