import { SkeletonLines } from '../../shared/ui/Skeleton/SkeletonLines';
import styles from './Quality.module.css';

const TILE_LINES = [50, 70, 85] as const;
const SECTION_LINES = [30, 90, 85, 90, 80] as const;

export function QualitySkeleton() {
  return (
    <div className={styles.layout}>
      <div className={styles.tiles}>
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className={styles.tile}>
            <SkeletonLines widths={TILE_LINES} />
          </div>
        ))}
      </div>
      <div className={styles.section}>
        <SkeletonLines widths={SECTION_LINES} />
      </div>
    </div>
  );
}
