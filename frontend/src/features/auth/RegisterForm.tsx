import { Button } from '@alfalab/core-components/button/modern';
import { useState } from 'react';
import { Link } from 'react-router';

import { useLogin, useRegister } from '../../api/hooks/auth';
import { AuthField } from './AuthField';
import styles from './Auth.module.css';
import { readFormErrors } from './formErrors';

const PASSWORD_MIN = 15;

/** Регистрация не входит сама — после неё сразу вход теми же данными. */
export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const register = useRegister();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const failed = register.isError ? register.error : login.isError ? login.error : null;
  const errors = failed ? readFormErrors(failed) : { fields: {} };
  const pending = register.isPending || login.isPending;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        login.reset();
        register.mutate(
          { email, password },
          {
            onSuccess: () => {
              login.mutate({ email, password }, { onSuccess });
            },
          },
        );
      }}
    >
      <AuthField
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="username"
        value={email}
        onChange={setEmail}
        error={errors.fields.email}
      />
      <AuthField
        label="Пароль"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        error={errors.fields.password}
        hint={`Не короче ${String(PASSWORD_MIN)} символов. Удобно взять фразу из нескольких слов.`}
      />
      {errors.form ? (
        <p className={styles.formError} role="alert">
          {errors.form}
        </p>
      ) : null}
      <Button
        type="submit"
        view="primary"
        size={48}
        block
        loading={pending}
        disabled={!email.trim() || !password}
      >
        Зарегистрироваться
      </Button>
      <p className={styles.switch}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </form>
  );
}
