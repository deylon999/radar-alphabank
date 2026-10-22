import { Button } from '@alfalab/core-components/button/modern';
import { useState } from 'react';
import { Link } from 'react-router';

import { apiConfig } from '../../api/config';
import { useLogin } from '../../api/hooks/auth';
import { AuthField } from './AuthField';
import styles from './Auth.module.css';
import { DemoAccounts } from './DemoAccounts';
import { readFormErrors } from './formErrors';

interface LoginFormProps {
  /** Пароль верный, нужен второй фактор. */
  onMfaRequired: () => void;
  onSuccess: () => void;
}

export function LoginForm({ onMfaRequired, onSuccess }: LoginFormProps) {
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const errors = login.isError ? readFormErrors(login.error) : { fields: {} };

  const submit = (credentials: { email: string; password: string }) => {
    login.mutate(credentials, {
      onSuccess: (result) => {
        if (result.status === 'mfa_required') {
          onMfaRequired();
        } else {
          onSuccess();
        }
      },
    });
  };

  return (
    <>
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit({ email, password });
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
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={errors.fields.password}
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
          loading={login.isPending}
          disabled={!email.trim() || !password}
        >
          Войти
        </Button>
        <p className={styles.switch}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
      {apiConfig.useMocks ? (
        <DemoAccounts
          onPick={(demoEmail, demoPassword) => {
            // Поля заполняются видимо, чтобы было понятно, под кем вошли.
            setEmail(demoEmail);
            setPassword(demoPassword);
            submit({ email: demoEmail, password: demoPassword });
          }}
        />
      ) : null}
    </>
  );
}
