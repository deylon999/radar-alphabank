import { Button } from '@alfalab/core-components/button/modern';
import { useId, useState } from 'react';

import { useCreateCompany } from '../../api/hooks/companies';
import type { UserRole } from '../../schemas/user';
import { AuthField } from '../auth/AuthField';
import { readFormErrors } from '../auth/formErrors';
import styles from './ConnectCompany.module.css';

/** Своя компания: пользователь становится владельцем и потом заполняет профиль. */
export function CreateCompanyForm({ position }: { position: UserRole }) {
  const create = useCreateCompany();
  const [name, setName] = useState('');
  const [inn, setInn] = useState('');
  const headingId = useId();
  const errors = create.isError ? readFormErrors(create.error) : { fields: {} };

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        Нет в списке? Создайте компанию
      </h2>
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({ name, inn, position });
        }}
      >
        <AuthField
          label="Название компании"
          autoComplete="organization"
          value={name}
          onChange={setName}
          error={errors.fields.name}
        />
        <AuthField
          label="ИНН"
          inputMode="numeric"
          autoComplete="off"
          value={inn}
          onChange={setInn}
          error={errors.fields.inn}
          hint="10 цифр для организации или 12 для ИП"
        />
        {errors.form ? (
          <p className={styles.error} role="alert">
            {errors.form}
          </p>
        ) : null}
        <div>
          <Button
            type="submit"
            view="primary"
            size={48}
            loading={create.isPending}
            disabled={!name.trim() || !inn.trim()}
          >
            Создать компанию
          </Button>
        </div>
      </form>
    </section>
  );
}
