import type { ReactNode } from 'react';

import styles from './VisuallyHidden.module.css';

/** Текст только для скринридеров: «(откроется в новой вкладке)» и т. п. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className={styles.hidden}>{children}</span>;
}
