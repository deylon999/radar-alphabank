import { Typography } from '@alfalab/core-components/typography/modern';
import type { ReactNode } from 'react';

import styles from './PageTitle.module.css';

/** Заголовок страницы (h1): крупный, но не гигантский — один размер на всех экранах. */
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <Typography.Title tag="h1" view="small" className={styles.title}>
      {children}
    </Typography.Title>
  );
}
