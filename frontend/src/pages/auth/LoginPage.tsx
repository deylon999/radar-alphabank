import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';

import { useMe } from '../../api/hooks/auth';
import { readNextPath } from '../../app/auth/nextPath';
import { LoginForm } from '../../features/auth/LoginForm';
import { SecondFactorForm } from '../../features/auth/SecondFactorForm';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { PageTitle } from '../../shared/ui/PageTitle';

export function LoginPage() {
  const [step, setStep] = useState<'password' | 'second-factor'>('password');
  const { search } = useLocation();
  const navigate = useNavigate();
  const me = useMe();
  const next = readNextPath(search);
  useDocumentTitle('Вход');

  // Уже вошли — например, открыли /login из закладки.
  if (me.data) {
    return <Navigate to={next} replace />;
  }

  const done = () => {
    void navigate(next, { replace: true });
  };

  return step === 'password' ? (
    <>
      <PageTitle>Вход в Радар</PageTitle>
      <LoginForm
        onSuccess={done}
        onMfaRequired={() => {
          setStep('second-factor');
        }}
      />
    </>
  ) : (
    <>
      <PageTitle>Подтверждение входа</PageTitle>
      <SecondFactorForm
        onSuccess={done}
        onRestart={() => {
          setStep('password');
        }}
      />
    </>
  );
}
