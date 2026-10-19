import cn from 'classnames';

import type { Insight } from '../../../schemas/insight';
import { impactRoleLabels, terms } from '../../../shared/labels';
import { Badge } from '../../../shared/ui/Badge/Badge';
import { InsightSection } from '../InsightSection/InsightSection';
import styles from './ImpactChain.module.css';

/**
 * Цепочка влияния — главный визуальный элемент страницы: от события до компании.
 * На десктопе шаги идут слева направо, на телефоне — сверху вниз. Компания в рамке.
 */
export function ImpactChain({ insight }: { insight: Insight }) {
  return (
    <InsightSection
      title={terms.whyItMatters}
      meta={<Badge tone="quiet">{terms.aiConclusion}</Badge>}
    >
      <p className={styles.summary}>{insight.whyItMatters}</p>
      <ol className={styles.chain}>
        {insight.impactPath.map((step, index) => (
          <li
            // Шаги цепочки фиксированы и не переставляются: индекс — устойчивый ключ.
            key={index}
            className={cn(styles.step, step.role === 'company' && styles.company)}
          >
            <span className={styles.role}>{impactRoleLabels[step.role]}</span>
            <span className={styles.label}>{step.label}</span>
          </li>
        ))}
      </ol>
      {insight.signals?.length ? (
        <div className={styles.signals}>
          <h3 className={styles.signalsTitle}>{terms.signals}</h3>
          <dl className={styles.signalList}>
            {insight.signals.map((signal) => (
              <div key={signal.label} className={styles.signal}>
                <dt>{signal.label}</dt>
                <dd>{signal.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </InsightSection>
  );
}
