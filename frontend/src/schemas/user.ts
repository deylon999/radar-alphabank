import { z } from 'zod';

/** Роль пользователя в компании: от неё зависит, что поднимается в ленте выше. */
export const USER_ROLES = ['owner', 'ceo', 'cfo', 'accountant', 'treasurer', 'other'] as const;

export const userRoleSchema = z.enum(USER_ROLES);

export type UserRole = z.infer<typeof userRoleSchema>;
