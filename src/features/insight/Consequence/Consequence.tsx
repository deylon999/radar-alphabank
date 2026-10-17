import type { Insight } from '../../../schemas/insight';
import { terms } from '../../../shared/labels';
import { Badge } from '../../../shared/ui/Badge/Badge';
import { InsightSection } from '../InsightSection/InsightSection';
import styles from './Consequence.module.css';

/**
 * Возможное последствие — всегда гипотеза: пунктирная рамка и метка «Гипотеза»
 * отличают его от установленных фактов (сплошной стиль) ещё до чтения текста.
 */
export function Consequence({ insight }: { insight: Insight }) {
  return (
    <InsightSection title={terms.consequence}>
      <div className={styles.hypothesis}>
        <Badge tone="quiet">{terms.hypothesis}</Badge>
        <p className={styles.text}>{insight.consequence}</p>
        <p className={styles.note}>{terms.hypothesisNote}</p>
      </div>
    </InsightSection>
  );
}

/** Установленные факты — сплошная рамка, в отличие от гипотезы. */
export function Basis({ insight }: { insight: Insight }) {
  return (
    <InsightSection title={terms.basis}>
      <ul className={styles.facts}>
        {insight.basis.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </InsightSection>
  );
}
