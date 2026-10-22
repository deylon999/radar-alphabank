import { useMe, useUpdatePosition } from '../../api/hooks/auth';
import type { UserRole } from '../../schemas/user';

const DEFAULT_ROLE: UserRole = 'ceo';

/**
 * Должность читателя в компании — из `/me`, меняется на сервере. От неё бэкенд поднимает
 * выше то, что важнее для роли: у одной компании несколько пользователей.
 */
export function useUserRole(): [UserRole, (role: UserRole) => void] {
  const me = useMe();
  const update = useUpdatePosition();
  const role = me.data?.membership?.position ?? DEFAULT_ROLE;
  return [
    role,
    (next) => {
      update.mutate(next);
    },
  ];
}
