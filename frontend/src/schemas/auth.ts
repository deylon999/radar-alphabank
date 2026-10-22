import { z } from 'zod';

import { isoDateTimeSchema } from './common';
import { userRoleSchema } from './user';

/** CSRF-токен для изменяющих запросов: приходит вместе с cookie сессии. */
export const csrfSchema = z.object({
  token: z.string().min(1),
  headerName: z.string().min(1),
});

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  twoFactorEnabled: z.boolean(),
});

export const authenticatedSchema = z.object({
  status: z.literal('authenticated'),
  user: authUserSchema,
  authenticatedAt: isoDateTimeSchema,
  idleTimeoutSeconds: z.number().int().positive(),
  absoluteExpiresAt: isoDateTimeSchema,
});

/** Пароль верный, но нужен второй фактор: вход ещё не завершён. */
export const mfaRequiredSchema = z.object({
  status: z.literal('mfa_required'),
  expiresAt: isoDateTimeSchema,
});

export const loginResponseSchema = z.discriminatedUnion('status', [
  authenticatedSchema,
  mfaRequiredSchema,
]);

export const registerResponseSchema = z.object({ id: z.string().min(1) });

export const credentialsSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(255),
});

export const SECOND_FACTOR_METHODS = ['totp', 'recovery_code'] as const;

export const secondFactorSchema = z.object({
  method: z.enum(SECOND_FACTOR_METHODS),
  code: z.string().trim().min(1),
});

/** Компания в членстве и заявке — без профиля: его отдаёт `GET /companies/:id`. */
export const companyRefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  inn: z.string().optional(),
  origin: z.enum(['dataset', 'user']),
});

export const membershipSchema = z.object({
  company: companyRefSchema,
  role: z.enum(['owner', 'member']),
  position: userRoleSchema.optional(),
  joinedAt: isoDateTimeSchema,
});

export const JOIN_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;

export const joinRequestSchema = z.object({
  id: z.string().min(1),
  company: companyRefSchema,
  applicant: z.object({ id: z.string().min(1), email: z.string().min(1) }),
  status: z.enum(JOIN_REQUEST_STATUSES),
  position: userRoleSchema.optional(),
  message: z.string().optional(),
  createdAt: isoDateTimeSchema,
  decidedAt: isoDateTimeSchema.optional(),
});

/** Текущий пользователь: членство в одной компании или заявка в неё. */
export const meSchema = z.object({
  user: authUserSchema,
  membership: membershipSchema.nullish(),
  joinRequest: joinRequestSchema.nullish(),
  canViewQualityMetrics: z.boolean(),
});

export type Csrf = z.infer<typeof csrfSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type Authenticated = z.infer<typeof authenticatedSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type Credentials = z.infer<typeof credentialsSchema>;
export type SecondFactor = z.infer<typeof secondFactorSchema>;
export type CompanyRef = z.infer<typeof companyRefSchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type JoinRequest = z.infer<typeof joinRequestSchema>;
export type Me = z.infer<typeof meSchema>;
