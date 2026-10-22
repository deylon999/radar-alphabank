import { Button } from '@alfalab/core-components/button/modern';
import { Radio } from '@alfalab/core-components/radio/modern';
import { useState } from 'react';

import { useVerifySecondFactor } from '../../api/hooks/auth';
import type { SecondFactor } from '../../schemas/auth';
import { AuthField } from './AuthField';
import styles from './Auth.module.css';
import { readFormErrors } from './formErrors';

const PENDING_EXPIRED = '/problems/pending-login-required';

interface SecondFactorFormProps {
  onSuccess: () => void;
  /** Ожидание второго фактора истекло — заново email и пароль. */
  onRestart: () => void;
}

export function SecondFactorForm({ onSuccess, onRestart }: SecondFactorFormProps) {
  const verify = useVerifySecondFactor();
  const [method, setMethod] = useState<SecondFactor['method']>('totp');
  const [code, setCode] = useState('');
  const errors = verify.isError ? readFormErrors(verify.error) : { fields: {} };
  const expired =
    verify.error && 'problemType' in verify.error && verify.error.problemType === PENDING_EXPIRED;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        verify.mutate({ method, code }, { onSuccess });
      }}
    >
      <fieldset className={styles.methods}>
        <legend className={styles.label}>Чем подтвердить вход</legend>
        <Radio
          size={24}
          name="method"
          label="Код из приложения"
          checked={method === 'totp'}
          onChange={() => {
            setMethod('totp');
          }}
        />
        <Radio
          size={24}
          name="method"
          label="Резервный код"
          checked={method === 'recovery_code'}
          onChange={() => {
            setMethod('recovery_code');
          }}
        />
      </fieldset>
      <AuthField
        label="Код"
        hint={
          method === 'totp'
            ? 'Шесть цифр из приложения-аутентификатора.'
            : 'Один из резервных кодов, которые вы сохранили при включении 2FA.'
        }
        inputMode={method === 'totp' ? 'numeric' : 'text'}
        autoComplete="one-time-code"
        focusOnMount
        value={code}
        onChange={setCode}
        error={errors.fields.code}
      />
      {errors.form ? (
        <p className={styles.formError} role="alert">
          {errors.form}
        </p>
      ) : null}
      {expired ? (
        <Button view="secondary" size={48} block onClick={onRestart}>
          Ввести email и пароль заново
        </Button>
      ) : (
        <Button
          type="submit"
          view="primary"
          size={48}
          block
          loading={verify.isPending}
          disabled={!code.trim()}
        >
          Подтвердить
        </Button>
      )}
    </form>
  );
}
