import { Button } from '@alfalab/core-components/button/modern';

import { DESCRIBE_TEXT_ID } from '../DescribeForm/DescribeForm';
import styles from './ProfileIntro.module.css';

/**
 * Промо первого входа (пункт 9.15.1 ТЗ): только когда в профиле ещё нет ни одного факта.
 * Единственная промо-плашка на экране.
 */
export function ProfileIntro() {
  return (
    <section className={styles.plate} aria-labelledby="profile-intro-title">
      <h2 id="profile-intro-title" className={styles.title}>
        Начните с&nbsp;профиля
      </h2>
      <p className={styles.text}>
        Расскажите о&nbsp;компании&nbsp;— и&nbsp;лента начнёт работать на&nbsp;вас.
      </p>
      <Button
        view="primary"
        colors="inverted"
        size={40}
        onClick={() => {
          document.getElementById(DESCRIBE_TEXT_ID)?.focus();
        }}
      >
        Описать компанию
      </Button>
    </section>
  );
}
