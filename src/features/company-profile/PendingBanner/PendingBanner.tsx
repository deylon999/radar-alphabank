import { Button } from '@alfalab/core-components/button/modern';

import { pluralForms, terms } from '../../../shared/labels';
import { pluralize, pluralWord } from '../../../shared/lib/plural';
import styles from './PendingBanner.module.css';

const waitForms = { one: 'ждёт', few: 'ждут', many: 'ждут' } as const;

interface PendingBannerProps {
  count: number;
  confirming: boolean;
  onConfirmAll: () => void;
}

/**
 * «N изменений ждут подтверждения» с «Подтвердить все». Свой блок, а не Plate из библиотеки:
 * у Plate role="alert", и скринридер перебивал бы пользователя при каждом изменении числа.
 */
export function PendingBanner({ count, confirming, onConfirmAll }: PendingBannerProps) {
  if (count === 0) {
    return (
      <p className={styles.done} role="status">
        Все факты проверены. {terms.profileHint}.
      </p>
    );
  }
  return (
    <section className={styles.banner} aria-labelledby="pending-banner-title">
      <div className={styles.text}>
        <h2 id="pending-banner-title" className={styles.title}>
          {pluralize(count, pluralForms.change)} {pluralWord(count, waitForms)} подтверждения
        </h2>
        <p className={styles.hint}>{terms.profileHint}.</p>
      </div>
      <Button view="primary" size={40} loading={confirming} onClick={onConfirmAll}>
        Подтвердить все
      </Button>
    </section>
  );
}
