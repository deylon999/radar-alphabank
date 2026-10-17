import { SystemMessage } from '@alfalab/core-components/system-message/modern';
import type { ReactNode } from 'react';

import styles from './StateMessage.module.css';

interface StateMessageProps {
  title: string;
  description?: ReactNode;
  /** Одно действие: «Повторить», «Уточнить профиль» и т. п. */
  action?: ReactNode;
  role?: 'alert' | 'status';
}

/** Общая основа пустого состояния и ошибки: заголовок, пояснение, одно действие. */
export function StateMessage({ title, description, action, role }: StateMessageProps) {
  return (
    <div className={styles.root} role={role}>
      <SystemMessage>
        <SystemMessage.Title tag="h2">{title}</SystemMessage.Title>
        {description ? <SystemMessage.Subtitle>{description}</SystemMessage.Subtitle> : null}
        {action ? (
          <SystemMessage.Controls>
            {/* Обёртка: в мобильном виде Controls растягивает детей, а кнопке нужна своя ширина. */}
            <div className={styles.action}>{action}</div>
          </SystemMessage.Controls>
        ) : null}
      </SystemMessage>
    </div>
  );
}
