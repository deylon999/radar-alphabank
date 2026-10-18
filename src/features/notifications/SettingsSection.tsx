import { type ReactNode, useId } from 'react';

import styles from './NotificationsSettings.module.css';

interface SettingsSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** Блок настроек: заголовок h2, пояснение и содержимое, связанные для скринридера. */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={styles.section}>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {description ? <p className={styles.muted}>{description}</p> : null}
      {children}
    </section>
  );
}
