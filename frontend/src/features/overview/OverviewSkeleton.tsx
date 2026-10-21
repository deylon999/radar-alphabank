import { SkeletonLines } from '../../shared/ui/Skeleton/SkeletonLines';
import styles from './Overview.module.css';

const GROUP_LINES = [30, 45, 90, 80, 85] as const;

export function OverviewSkeleton() {
  return (
    <div className={styles.groups}>
      {[0, 1, 2].map((index) => (
        <div key={index} className={styles.group}>
          <SkeletonLines widths={GROUP_LINES} />
        </div>
      ))}
    </div>
  );
}
