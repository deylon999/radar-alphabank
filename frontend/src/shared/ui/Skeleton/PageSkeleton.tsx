import { Skeleton } from '@alfalab/core-components/skeleton/modern';

import styles from './Skeleton.module.css';
import { SkeletonLines } from './SkeletonLines';

interface PageSkeletonProps {
  /** Сколько блоков-карточек показать под заголовком. */
  blocks?: number;
}

const BLOCK_LINES = [35, 90, 70] as const;

/** Скелетон страницы: заголовок и блоки. Место под контент зарезервировано заранее. */
export function PageSkeleton({ blocks = 3 }: PageSkeletonProps) {
  return (
    <div role="status" aria-busy="true" aria-label="Загрузка">
      <Skeleton visible animate={false} borderRadius={6} className={styles.title} />
      {Array.from({ length: blocks }, (_, index) => (
        <div key={index} className={styles.block}>
          <SkeletonLines widths={BLOCK_LINES} />
        </div>
      ))}
    </div>
  );
}
