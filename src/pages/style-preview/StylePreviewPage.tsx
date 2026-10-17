import { Button } from '@alfalab/core-components/button/modern';
import { Checkbox } from '@alfalab/core-components/checkbox/modern';
import { Input } from '@alfalab/core-components/input/modern';
import { Status } from '@alfalab/core-components/status/modern';
import { Tag } from '@alfalab/core-components/tag/modern';
import { Typography } from '@alfalab/core-components/typography/modern';
import cn from 'classnames';
import { useEffect, useState } from 'react';

import styles from './StylePreviewPage.module.css';

const PANGRAM = 'Съешь же ещё этих мягких французских булок';
const SYMBOLS = '1 250 000 ₽ · № 42 — «Склад „Южный-2“»';

const WEIGHTS = [
  { className: styles.w400, label: '400 · Regular' },
  { className: styles.w500, label: '500 · Medium' },
  { className: styles.w700, label: '700 · Bold' },
  { className: styles.w900, label: '900 · Black — только промо' },
] as const;

/** Временная служебная страница шага 1: шрифт и компоненты core-components. Удалится в шаге 3. */
export function StylePreviewPage() {
  const [checked, setChecked] = useState(false);
  const [tagOn, setTagOn] = useState(true);

  useEffect(() => {
    document.title = 'Проверка стилей — Радар';
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <Typography.Title tag="h1" view="medium">
          Радар
        </Typography.Title>
        <Typography.Text view="primary-medium" color="secondary" tag="p">
          Служебная страница: проверка шрифта и компонентов библиотеки.
        </Typography.Text>
      </div>

      <section className={styles.section} aria-labelledby="weights-title">
        <Typography.Title tag="h2" view="xsmall" id="weights-title">
          Начертания шрифта
        </Typography.Title>
        <ul className={styles.weights}>
          {WEIGHTS.map(({ className, label }) => (
            <li key={label} className={styles.weightRow}>
              <Typography.Text view="primary-small" color="secondary">
                {label}
              </Typography.Text>
              <p className={cn(styles.sample, className)}>
                {PANGRAM}. {SYMBOLS}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="components-title">
        <Typography.Title tag="h2" view="xsmall" id="components-title">
          Компоненты core-components
        </Typography.Title>
        <div className={styles.row}>
          <Status color="red" view="soft">
            Срочный риск
          </Status>
          <Status color="green" view="soft">
            Возможность
          </Status>
          <Status color="orange" view="soft">
            Ждёт подтверждения
          </Status>
        </div>
        <div className={styles.row}>
          <Button view="accent" size={40}>
            Подтвердить
          </Button>
          <Button view="secondary" size={40}>
            Скрыть
          </Button>
          <Button view="secondary" size={40} loading>
            Сохранить
          </Button>
          <Tag
            size={40}
            checked={tagOn}
            onClick={() => {
              setTagOn((value) => !value);
            }}
          >
            Только риски
          </Tag>
        </div>
        <div className={styles.row}>
          <Checkbox
            checked={checked}
            onChange={(_, payload) => {
              setChecked(payload.checked);
            }}
            label="Проверить статус отгрузки"
          />
        </div>
        <div className={styles.field}>
          <Input label="Название компании" labelView="outer" block placeholder="ООО «Пример»" />
        </div>
      </section>
    </main>
  );
}
