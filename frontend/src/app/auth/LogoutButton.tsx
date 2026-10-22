import { IconButton } from '@alfalab/core-components/icon-button/modern';
import { LogOutMIcon } from '@alfalab/icons-glyph/LogOutMIcon';
import type { SVGProps } from 'react';
import { useNavigate } from 'react-router';

import { useLogout, useMe } from '../../api/hooks/auth';

function LogoutIcon(props: SVGProps<SVGSVGElement>) {
  return <LogOutMIcon {...props} aria-hidden="true" />;
}

/** Выход: в подсказке — под каким email вошли. */
export function LogoutButton() {
  const me = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const email = me.data?.user.email;

  return (
    <IconButton
      icon={LogoutIcon}
      size={40}
      aria-label="Выйти"
      title={email ? `Выйти (${email})` : 'Выйти'}
      disabled={logout.isPending}
      onClick={() => {
        logout.mutate(undefined, {
          onSettled: () => {
            void navigate('/login', { replace: true });
          },
        });
      }}
    />
  );
}
