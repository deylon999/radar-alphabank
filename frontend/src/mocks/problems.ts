import { HttpResponse } from 'msw';

/** Ошибки — в формате Problem Details, как в спецификации `api/`. */
const DEFAULTS: Record<number, { type: string; title: string }> = {
  400: { type: '/problems/malformed-request', title: 'Некорректный запрос' },
  401: { type: '/problems/authentication-required', title: 'Нужно войти' },
  403: { type: '/problems/invalid-csrf-token', title: 'Доступ запрещён' },
  404: { type: '/problems/not-found', title: 'Не найдено' },
  409: { type: '/problems/conflict', title: 'Конфликт' },
  422: { type: '/problems/validation-failed', title: 'Ошибка валидации' },
  500: { type: '/problems/internal-error', title: 'Ошибка сервера' },
};

export interface ProblemOptions {
  type?: string;
  title?: string;
  errors?: { field: string; title: string; description: string }[];
}

export function problem(status: number, detail: string, options: ProblemOptions = {}) {
  const base = DEFAULTS[status] ?? { type: 'about:blank', title: 'Ошибка' };
  return HttpResponse.json(
    { ...base, ...options, status, detail },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' },
    },
  );
}
