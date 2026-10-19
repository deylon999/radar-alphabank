import type { BankMaterial, Insight } from '../../../schemas/insight';
import { terms } from '../../../shared/labels';
import { formatLongDate } from '../../../shared/lib/date';
import { NBSP } from '../../../shared/lib/typography';
import { Badge } from '../../../shared/ui/Badge/Badge';
import { InsightSection } from '../InsightSection/InsightSection';
import sectionStyles from '../InsightSection/InsightSection.module.css';
import styles from './BankView.module.css';

function MaterialLine({ material }: { material: BankMaterial }) {
  return (
    <p className={sectionStyles.muted}>
      «{material.title}», {formatLongDate(material.publishedAt)}
      {material.page ? `, с.${NBSP}${String(material.page)}` : ''}
    </p>
  );
}

/**
 * Позиция Альфа-Банка — отдельно от выводов модели: своя метка, цитата из материала с датой.
 * Пересмотренная оценка показывается рядом, устаревший материал — с предупреждением.
 */
export function BankView({ insight }: { insight: Insight }) {
  const view = insight.bankView;

  return (
    <InsightSection title={terms.bankView} meta={<Badge tone="strong">{terms.bankPosition}</Badge>}>
      {view ? (
        <div className={styles.view}>
          {view.material.outdated ? (
            <p className={styles.warning} role="note">
              <strong>{terms.materialOutdated}.</strong> Обзор от{' '}
              {formatLongDate(view.material.publishedAt)} не отражает текущую ситуацию, вывод сделан
              без опоры на него.
            </p>
          ) : null}
          <blockquote className={styles.quote}>
            <p>{view.summary}</p>
          </blockquote>
          <MaterialLine material={view.material} />
          {view.supersedes ? (
            <div className={styles.revised}>
              <p className={styles.revisedTitle}>{terms.bankRevised}</p>
              <p>
                <span className={sectionStyles.muted}>Было: </span>
                {view.supersedes.summary}
              </p>
              <MaterialLine material={view.supersedes.material} />
            </div>
          ) : null}
        </div>
      ) : (
        <p className={sectionStyles.muted}>{terms.noBankView}.</p>
      )}
    </InsightSection>
  );
}
