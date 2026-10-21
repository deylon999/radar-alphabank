import cn from 'classnames';
import { type ReactNode, useId } from 'react';

import styles from './InsightSection.module.css';

interface InsightSectionProps {
  title: string;
  /** Справа от заголовка: например, счётчик «1 из 3». */
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Раздел карточки инсайта: заголовок h2 и содержимое, связанные для скринридера. */
export function InsightSection({ title, meta, className, children }: InsightSectionProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={cn(styles.section, className)}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {meta}
      </div>
      {children}
    </section>
  );
}
