import cn from 'classnames';

import type { Insight } from '../../../schemas/insight';
import { impactRoleLabels, terms } from '../../../shared/labels';
import { InsightSection } from '../InsightSection/InsightSection';
import styles from './ImpactChain.module.css';

/**
 * Цепочка влияния — главный визуальный элемент страницы: от события до компании.
 * На десктопе шаги идут слева направо, на телефоне — сверху вниз. Компания в рамке.
 */
export function ImpactChain({ insight }: { insight: Insight }) {
  return (
    <InsightSection title={terms.whyItMatters}>
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
    </InsightSection>
  );
}
