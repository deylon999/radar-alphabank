import { Navigate, useNavigate } from 'react-router';

import { useMe } from '../../api/hooks/auth';
import { RegisterForm } from '../../features/auth/RegisterForm';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { PageTitle } from '../../shared/ui/PageTitle';

export function RegisterPage() {
  const navigate = useNavigate();
  const me = useMe();
  useDocumentTitle('Регистрация');

  if (me.data) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <PageTitle>Регистрация</PageTitle>
      <RegisterForm
        onSuccess={() => {
          void navigate('/', { replace: true });
        }}
      />
    </>
  );
}
