import { http, HttpResponse } from 'msw';
import type { z } from 'zod';

import { credentialsSchema, secondFactorSchema } from '../schemas/auth';
import type { MockStore, MockUser } from './db';
import { problem } from './problems';
import { meOf } from './views';

const API = '*/api';
const CSRF_HEADER = 'X-CSRF-TOKEN';
const SESSION_HOURS = 8;
const IDLE_TIMEOUT_SECONDS = 3600;
const MFA_MINUTES = 5;
const PASSWORD_MIN = 15;

/** Без входа доступны только CSRF, регистрация и вход. */
const PUBLIC_PATHS = [
  '/api/auth/csrf',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/login/2fa',
];
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function newToken(): string {
  return crypto.randomUUID();
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function currentUser(store: MockStore): MockUser | undefined {
  const { userId } = store.session();
  return userId ? store.read().users.find((user) => user.id === userId) : undefined;
}

function authUser(user: MockUser) {
  return { id: user.id, email: user.email, twoFactorEnabled: Boolean(user.totp) };
}

function signIn(store: MockStore, user: MockUser) {
  // Как на настоящем бэкенде: после входа идентификатор сессии и CSRF-токен новые.
  store.writeSession((session) => {
    session.userId = user.id;
    session.pendingUserId = undefined;
    session.csrf = newToken();
  });
  const now = Date.now();
  return {
    status: 'authenticated' as const,
    user: authUser(user),
    authenticatedAt: new Date(now).toISOString(),
    idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
    absoluteExpiresAt: new Date(now + SESSION_HOURS * 3_600_000).toISOString(),
  };
}

async function readBody<Schema extends z.ZodType>(request: Request, schema: Schema) {
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Проверки, общие для всех запросов, — как у настоящего бэкенда: изменяющий запрос без
 * верного CSRF-токена — 403, закрытый эндпоинт без входа — 401. Иначе запрос идёт дальше.
 */
export function createGuard(store: MockStore) {
  return http.all(`${API}/*`, ({ request }) => {
    const { pathname } = new URL(request.url);
    if (!SAFE_METHODS.has(request.method)) {
      const token = request.headers.get(CSRF_HEADER);
      if (!token || token !== store.session().csrf) {
        return problem(403, 'Сессия обновилась. Повторите действие.', {
          type: '/problems/invalid-csrf-token',
          title: 'Неверный CSRF-токен',
        });
      }
    }
    if (!PUBLIC_PATHS.includes(pathname) && !currentUser(store)) {
      return problem(401, 'Войдите, чтобы продолжить.');
    }
    return undefined;
  });
}

export function createAuthHandlers(store: MockStore, prelude: () => Promise<Response | undefined>) {
  return [
    http.get(`${API}/auth/csrf`, async () => {
      const failure = await prelude();
      if (failure) return failure;
      if (!store.session().csrf) {
        store.writeSession((session) => {
          session.csrf = newToken();
        });
      }
      return HttpResponse.json({ token: store.session().csrf, headerName: CSRF_HEADER });
    }),

    http.post(`${API}/auth/register`, async ({ request }) => {
      const failure = await prelude();
      if (failure) return failure;
      const body = await readBody(request, credentialsSchema);
      if (!body) return problem(400, 'Неверный формат запроса');
      const email = body.email.trim().toLowerCase();
      const errors = [
        ...(isEmail(email)
          ? []
          : [
              { field: 'email', title: 'INVALID_FORMAT', description: 'Укажите корректный email.' },
            ]),
        ...(body.password.length >= PASSWORD_MIN
          ? []
          : [
              {
                field: 'password',
                title: 'OUT_OF_RANGE',
                description: `Пароль — от ${String(PASSWORD_MIN)} символов.`,
              },
            ]),
      ];
      if (errors.length > 0) {
        return problem(422, errors.map((issue) => issue.description).join(' '), { errors });
      }
      if (store.read().users.some((user) => user.email === email)) {
        return problem(409, 'Этот email уже зарегистрирован. Войдите или укажите другой.', {
          type: '/problems/email-already-exists',
          title: 'Email уже используется',
        });
      }
      const id = `user-${newToken()}`;
      store.write((db) => {
        db.users.push({ id, email, password: body.password, canViewQualityMetrics: false });
      });
      return HttpResponse.json({ id }, { status: 201 });
    }),

    http.post(`${API}/auth/login`, async ({ request }) => {
      const failure = await prelude();
      if (failure) return failure;
      const body = await readBody(request, credentialsSchema);
      if (!body) return problem(400, 'Неверный формат запроса');
      const email = body.email.trim().toLowerCase();
      const user = store.read().users.find((item) => item.email === email);
      if (user?.password !== body.password) {
        return problem(401, 'Неверный email или пароль.', {
          type: '/problems/invalid-credentials',
          title: 'Не удалось войти',
        });
      }
      if (user.totp) {
        store.writeSession((session) => {
          session.pendingUserId = user.id;
          session.csrf = newToken();
        });
        return HttpResponse.json({
          status: 'mfa_required',
          expiresAt: new Date(Date.now() + MFA_MINUTES * 60_000).toISOString(),
        });
      }
      return HttpResponse.json(signIn(store, user));
    }),

    http.post(`${API}/auth/login/2fa`, async ({ request }) => {
      const failure = await prelude();
      if (failure) return failure;
      const body = await readBody(request, secondFactorSchema);
      if (!body) return problem(400, 'Неверный формат запроса');
      const { pendingUserId } = store.session();
      const user = store.read().users.find((item) => item.id === pendingUserId);
      if (!user?.totp) {
        return problem(401, 'Время на ввод кода истекло. Введите email и пароль ещё раз.', {
          type: '/problems/pending-login-required',
          title: 'Начните вход заново',
        });
      }
      if (body.code !== user.totp) {
        return problem(401, 'Код не подошёл. Проверьте его и попробуйте ещё раз.', {
          type: '/problems/invalid-second-factor',
          title: 'Неверный код',
        });
      }
      return HttpResponse.json(signIn(store, user));
    }),

    http.post(`${API}/auth/logout`, async () => {
      const failure = await prelude();
      if (failure) return failure;
      store.writeSession((session) => {
        session.userId = undefined;
        session.pendingUserId = undefined;
        session.csrf = newToken();
      });
      return new HttpResponse(null, { status: 204 });
    }),

    http.get(`${API}/me`, async () => {
      const failure = await prelude();
      if (failure) return failure;
      const user = currentUser(store);
      return user
        ? HttpResponse.json(meOf(store.read(), user))
        : problem(401, 'Войдите, чтобы продолжить.');
    }),
  ];
}
