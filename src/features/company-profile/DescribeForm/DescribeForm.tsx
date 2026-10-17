import { Button } from '@alfalab/core-components/button/modern';
import { Textarea } from '@alfalab/core-components/textarea/modern';
import { useId } from 'react';

import type { ProfileFact } from '../../../schemas/company';
import { terms } from '../../../shared/labels';
import styles from './DescribeForm.module.css';
import { FilesField } from './FilesField';
import { LinksField } from './LinksField';
import { useDescribeForm } from './useDescribeForm';

const TEXT_LIMIT = 5000;

/** Поле описания — сюда ведёт кнопка промо-плашки пустого профиля. */
export const DESCRIBE_TEXT_ID = 'describe-company-text';

interface DescribeFormProps {
  companyId: string;
  /** Материалы разобраны: факты уже в профиле со статусом «ждёт подтверждения». */
  onDone: (facts: ProfileFact[]) => void;
}

/** «Расскажите о компании»: свободный текст, ссылки и документы — всё необязательно по отдельности. */
export function DescribeForm({ companyId, onDone }: DescribeFormProps) {
  const form = useDescribeForm(companyId, onDone);
  const titleId = useId();
  const formErrorId = useId();

  return (
    <section aria-labelledby={titleId} className={styles.section}>
      <h2 id={titleId} className={styles.title}>
        {terms.describeCompany}
      </h2>
      <p className={styles.hint}>
        Своими словами: что производите, где площадки и склады, кто поставщики и клиенты. Система
        выделит факты и попросит их подтвердить.
      </p>
      <form
        className={styles.form}
        noValidate
        aria-busy={form.isProcessing}
        aria-describedby={form.formError ? formErrorId : undefined}
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit();
        }}
      >
        <div className={styles.field}>
          <label htmlFor={DESCRIBE_TEXT_ID} className={styles.label}>
            Описание
          </label>
          <Textarea
            id={DESCRIBE_TEXT_ID}
            block
            minRows={4}
            maxLength={TEXT_LIMIT}
            placeholder="Например: склад «Южный-2» в Заречном районе отгружает упаковку на маслозавод"
            value={form.text}
            disabled={form.isProcessing}
            onChange={(_, { value }) => {
              form.setText(value);
            }}
          />
        </div>
        <LinksField {...form} disabled={form.isProcessing} />
        <FilesField {...form} disabled={form.isProcessing} />
        {form.formError ? (
          <p id={formErrorId} className={styles.error} role="alert">
            {form.formError}
          </p>
        ) : null}
        {form.submitError ? (
          <p className={styles.error} role="alert">
            {form.submitError}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button type="submit" view="primary" size={48} loading={form.isProcessing}>
            Разобрать материалы
          </Button>
          <p role="status" className={styles.status}>
            {/* Индикатор загрузки — у самой кнопки; здесь текст для глаз и скринридера. */}
            {form.isProcessing ? 'Разбираем материалы…' : null}
          </p>
        </div>
      </form>
    </section>
  );
}
