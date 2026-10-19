import { useSyncExternalStore } from 'react';

import { type UserRole, userRoleSchema } from '../../schemas/user';
import { safeStorage } from './safeStorage';

export const USER_ROLE_STORAGE_KEY = 'radar-user-role';
const DEFAULT_ROLE: UserRole = 'ceo';

const listeners = new Set<() => void>();

function readRole(): UserRole {
  const parsed = userRoleSchema.safeParse(safeStorage.get(USER_ROLE_STORAGE_KEY));
  return parsed.success ? parsed.data : DEFAULT_ROLE;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function setUserRole(role: UserRole) {
  safeStorage.set(USER_ROLE_STORAGE_KEY, role);
  listeners.forEach((listener) => {
    listener();
  });
}

/**
 * Роль читателя: от неё бэкенд поднимает выше то, что важнее для роли. Хранится в браузере —
 * у одной компании несколько пользователей с разными ролями.
 */
export function useUserRole(): [UserRole, (role: UserRole) => void] {
  const role = useSyncExternalStore(subscribe, readRole, () => DEFAULT_ROLE);
  return [role, setUserRole];
}
