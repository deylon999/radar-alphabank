import { ArrowRightUpSIcon } from '@alfalab/icons-glyph/ArrowRightUpSIcon';

import type { Insight } from '../../../schemas/insight';
import { terms } from '../../../shared/labels';
import { VisuallyHidden } from '../../../shared/ui/VisuallyHidden/VisuallyHidden';
import { InsightSection } from '../InsightSection/InsightSection';
import sectionStyles from '../InsightSection/InsightSection.module.css';
import styles from './BankOffer.module.css';

/** Продукт банка по теме инсайта — явно подписан как предложение банка, не как вывод. */
export function BankOffer({ insight }: { insight: Insight }) {
  const offer = insight.offer;
  if (!offer) {
    return null;
  }

  return (
    <InsightSection title={terms.offer}>
      <div className={styles.offer}>
        <p className={styles.title}>{offer.title}</p>
        <p className={sectionStyles.muted}>{offer.description}</p>
        <a href={offer.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
          Подробнее
          <ArrowRightUpSIcon aria-hidden="true" className={styles.external} />
          <VisuallyHidden> о продукте «{offer.title}» (откроется в новой вкладке)</VisuallyHidden>
        </a>
      </div>
    </InsightSection>
  );
}
