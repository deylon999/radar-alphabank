import {
  type Authenticated,
  type Membership,
  membershipSchema,
  authenticatedSchema,
  type Credentials,
  type LoginResponse,
  loginResponseSchema,
  type Me,
  meSchema,
  registerResponseSchema,
  type SecondFactor,
} from '../../schemas/auth';
import type { UserRole } from '../../schemas/user';
import { request, requestVoid, resetCsrf } from '../http';

/** Регистрация не выполняет вход: после неё нужен `login`. */
export async function register(credentials: Credentials): Promise<string> {
  const { id } = await request('/api/auth/register', registerResponseSchema, {
    method: 'POST',
    json: credentials,
  });
  return id;
}

/** После входа cookie сессии меняется, вместе с ней — CSRF-токен. */
export async function login(credentials: Credentials): Promise<LoginResponse> {
  const result = await request('/api/auth/login', loginResponseSchema, {
    method: 'POST',
    json: credentials,
  });
  resetCsrf();
  return result;
}

export async function verifySecondFactor(body: SecondFactor): Promise<Authenticated> {
  const result = await request('/api/auth/login/2fa', authenticatedSchema, {
    method: 'POST',
    json: body,
  });
  resetCsrf();
  return result;
}

export async function logout(): Promise<void> {
  try {
    await requestVoid('/api/auth/logout', { method: 'POST' });
  } finally {
    resetCsrf();
  }
}

export function updatePosition(position: UserRole): Promise<Membership> {
  return request('/api/me/membership', membershipSchema, { method: 'PATCH', json: { position } });
}

export function fetchMe(signal?: AbortSignal): Promise<Me> {
  return request('/api/me', meSchema, { signal });
}
