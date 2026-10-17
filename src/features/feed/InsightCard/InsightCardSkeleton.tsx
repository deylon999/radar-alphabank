import { SkeletonLines } from '../../../shared/ui/Skeleton/SkeletonLines';
import styles from './InsightCard.module.css';

/** Повторяет форму карточки: метки, заголовок, «почему», цепочка, источники. */
const CARD_LINES = [35, 85, 70, 55, 20] as const;

export function InsightCardSkeleton() {
  return (
    <div className={styles.card}>
      <SkeletonLines widths={CARD_LINES} />
    </div>
  );
}
