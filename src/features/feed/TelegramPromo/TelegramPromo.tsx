import { IconButton } from '@alfalab/core-components/icon-button/modern';
import { CrossMIcon } from '@alfalab/icons-glyph/CrossMIcon';
import { type SVGProps, useState } from 'react';

import { useNotificationSettings } from '../../../api/hooks/notifications';
import { safeStorage } from '../../../shared/lib/safeStorage';
import { ButtonLink } from '../../../shared/ui/ButtonLink';
import styles from './TelegramPromo.module.css';

/** Иконка декоративная: доступное имя есть у самой кнопки. */
function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return <CrossMIcon {...props} aria-hidden="true" />;
}

export const TELEGRAM_PROMO_DISMISSED_KEY = 'radar.telegramPromoDismissed';

/**
 * Промо-плашка в ленте, пока Telegram не подключён (раздел 9.15 ТЗ).
 * Закрывается крестиком и больше не появляется. Пока настройки грузятся — ничего не показываем.
 */
export function TelegramPromo() {
  const settings = useNotificationSettings();
  const [dismissed, setDismissed] = useState(
    () => safeStorage.get(TELEGRAM_PROMO_DISMISSED_KEY) === '1',
  );

  if (dismissed || !settings.data || settings.data.telegram.connected) {
    return null;
  }

  return (
    <section className={styles.plate} aria-labelledby="telegram-promo-title">
      <h2 id="telegram-promo-title" className={styles.title}>
        Срочное&nbsp;— в&nbsp;Telegram
      </h2>
      <p className={styles.text}>Подключите Telegram&nbsp;— срочное придёт сразу.</p>
      <ButtonLink to="/notifications" view="primary" colors="inverted" size={40}>
        Подключить Telegram
      </ButtonLink>
      <IconButton
        icon={CloseIcon}
        colors="inverted"
        view="secondary"
        size={32}
        className={styles.close}
        aria-label="Закрыть предложение подключить Telegram"
        onClick={() => {
          safeStorage.set(TELEGRAM_PROMO_DISMISSED_KEY, '1');
          setDismissed(true);
        }}
      />
    </section>
  );
}
