import { Skeleton } from '@alfalab/core-components/skeleton/modern';
import cn from 'classnames';

import styles from './Skeleton.module.css';

interface SkeletonLinesProps {
  /** Ширина строк в процентах — повторяет реальный текст блока. */
  widths: readonly number[];
  className?: string;
}

/** Статичные серые строки: без перелива, как требует продуктовый стиль. */
export function SkeletonLines({ widths, className }: SkeletonLinesProps) {
  return (
    <div className={cn(styles.lines, className)}>
      {widths.map((width, index) => (
        <Skeleton
          // Строки скелетона одинаковые и не переставляются — индекс как ключ безопасен.
          key={index}
          visible
          animate={false}
          borderRadius={4}
          className={styles.line}
          style={{ width: `${String(width)}%` }}
        />
      ))}
    </div>
  );
}
