import { Button } from '@alfalab/core-components/button/modern';
import { ArrowRightUpSIcon } from '@alfalab/icons-glyph/ArrowRightUpSIcon';

import type { NotificationSettings } from '../../../schemas/notifications';
import { terms } from '../../../shared/labels';
import { Badge } from '../../../shared/ui/Badge/Badge';
import { VisuallyHidden } from '../../../shared/ui/VisuallyHidden/VisuallyHidden';
import { SettingsSection } from '../SettingsSection';
import styles from './TelegramCard.module.css';
import { useTelegramConnection } from './useTelegramConnection';

/** Telegram: статус, подключение по ссылке на бота, имя пользователя и «Отключить». */
export function TelegramCard({ settings }: { settings: NotificationSettings }) {
  const telegram = useTelegramConnection(settings);

  if (telegram.connected) {
    return (
      <SettingsSection title={terms.telegram}>
        <div className={styles.row}>
          <Badge tone="positive">Подключён</Badge>
          <span className={styles.username}>
            {telegram.username ? `@${telegram.username}` : 'Аккаунт привязан'}
          </span>
        </div>
        <p className={styles.muted}>Срочные инсайты и сводка приходят в этот аккаунт.</p>
        <div className={styles.actions}>
          {/*
           * key у кнопок каждого состояния: иначе React переиспользует кнопку на той же позиции,
           * и минимальные 500 мс загрузки из Button перетекают на «Открыть Telegram» и «Отключить».
           */}
          <Button key="disconnect" view="secondary" size={40} onClick={telegram.disconnect}>
            Отключить
          </Button>
        </div>
      </SettingsSection>
    );
  }

  if (telegram.linkUrl) {
    const url = telegram.linkUrl;
    return (
      <SettingsSection title={terms.telegram}>
        <div className={styles.row}>
          <Badge tone="attention">Ждём подтверждения</Badge>
        </div>
        <ol className={styles.steps}>
          <li>Откройте бота «Радар» по ссылке и нажмите «Старт».</li>
          <li>Вернитесь сюда&nbsp;— статус обновится сам.</li>
        </ol>
        <div className={styles.actions}>
          <Button
            key="open"
            view="primary"
            size={40}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            rightAddons={<ArrowRightUpSIcon aria-hidden="true" />}
          >
            Открыть Telegram
            <VisuallyHidden> (откроется в новой вкладке)</VisuallyHidden>
          </Button>
          <Button
            key="copy"
            view="secondary"
            size={40}
            onClick={() => {
              void telegram.copyLink(url);
            }}
          >
            Скопировать ссылку
          </Button>
        </div>
        <p className={styles.muted}>
          Ссылка: <span className={styles.url}>{url}</span>
        </p>
        <Button
          view="transparent"
          size={32}
          loading={telegram.isChecking}
          onClick={() => {
            void telegram.check();
          }}
        >
          Проверить подключение
        </Button>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title={terms.telegram}
      description={
        <>
          Срочные риски и&nbsp;возможности придут в&nbsp;Telegram сразу, сводка&nbsp;—
          по&nbsp;расписанию.
        </>
      }
    >
      <div className={styles.row}>
        <Badge tone="quiet">Не подключён</Badge>
      </div>
      {telegram.linkFailed ? (
        <p className={styles.error} role="alert">
          Не удалось получить ссылку. Попробуйте ещё раз.
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button
          key="connect"
          view="primary"
          size={40}
          loading={telegram.isRequestingLink}
          onClick={telegram.requestLink}
        >
          Подключить Telegram
        </Button>
      </div>
    </SettingsSection>
  );
}
