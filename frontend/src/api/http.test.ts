/** @vitest-environment node */
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ApiError } from './ApiError';
import { apiConfig, mockStatus } from './config';
import { buildUrl, request, requestVoid, resetCsrf } from './http';

const BASE = apiConfig.apiUrl;
const itemSchema = z.object({ id: z.string() });
let csrfIssued = 0;
const server = setupServer(
  http.get(`${BASE}/api/auth/csrf`, () => {
    csrfIssued += 1;
    return HttpResponse.json({ token: `token-${String(csrfIssued)}`, headerName: 'X-CSRF-TOKEN' });
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  mockStatus.restart = undefined;
  resetCsrf();
  csrfIssued = 0;
});
afterAll(() => {
  server.close();
});

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) {
      return error;
    }
    throw error;
  }
  throw new Error('Ожидалась ошибка ApiError');
}

describe('request', () => {
  it('отправляет запрос на VITE_API_URL и возвращает проверенные данные', async () => {
    let requestedUrl = '';
    server.use(
      http.get(`${BASE}/api/item`, ({ request: incoming }) => {
        requestedUrl = incoming.url;
        return HttpResponse.json({ id: 'a1', extra: 'лишнее поле отбрасывается' });
      }),
    );

    await expect(
      request('/api/item', itemSchema, { query: { kind: ['risk', 'opportunity'] } }),
    ).resolves.toEqual({ id: 'a1' });
    expect(requestedUrl).toBe(`${BASE}/api/item?kind=risk&kind=opportunity`);
  });

  it('превращает ответ не по контракту в ApiError parse', async () => {
    server.use(http.get(`${BASE}/api/item`, () => HttpResponse.json({ id: 42 })));

    const error = await captureError(request('/api/item', itemSchema));

    expect(error.kind).toBe('parse');
    expect(error.isRetryable).toBe(false);
  });

  it('превращает ответ не в JSON в ApiError parse', async () => {
    server.use(http.get(`${BASE}/api/item`, () => HttpResponse.text('<html>')));

    expect((await captureError(request('/api/item', itemSchema))).kind).toBe('parse');
  });

  it('превращает сбой сети в ApiError network', async () => {
    server.use(http.get(`${BASE}/api/item`, () => HttpResponse.error()));

    const error = await captureError(request('/api/item', itemSchema));

    expect(error.kind).toBe('network');
    expect(error.isRetryable).toBe(true);
  });

  it('понимает и прежний формат { message }', async () => {
    server.use(
      http.get(`${BASE}/api/item`, () =>
        HttpResponse.json({ message: 'Компания не найдена' }, { status: 404 }),
      ),
    );

    const error = await captureError(request('/api/item', itemSchema));

    expect(error).toMatchObject({ kind: 'http', status: 404, message: 'Компания не найдена' });
    expect(error.isRetryable).toBe(false);
  });

  it('читает Problem Details: текст из detail, тип и ошибки полей', async () => {
    const problem = (body: object, status: number) =>
      HttpResponse.json(body, {
        status,
        headers: { 'Content-Type': 'application/problem+json' },
      });
    server.use(
      http.post(`${BASE}/api/login`, () =>
        problem(
          {
            type: '/problems/validation-failed',
            title: 'Проверьте поля',
            status: 422,
            detail: 'Email указан неверно',
            errors: [{ field: 'email', title: 'invalid_format', description: 'Нет символа @' }],
          },
          422,
        ),
      ),
      http.get(`${BASE}/api/item`, () =>
        problem({ type: '/problems/not-found', title: 'Компания не найдена', status: 404 }, 404),
      ),
    );
    let restarts = 0;
    mockStatus.restart = () => {
      restarts += 1;
      return Promise.resolve();
    };

    const invalid = await captureError(request('/api/login', itemSchema, { method: 'POST' }));
    const missing = await captureError(request('/api/item', itemSchema));

    expect(invalid).toMatchObject({
      kind: 'http',
      status: 422,
      message: 'Email указан неверно',
      problemType: '/problems/validation-failed',
      issues: [{ field: 'email', title: 'invalid_format', description: 'Нет символа @' }],
    });
    expect(missing).toMatchObject({ status: 404, message: 'Компания не найдена' });
    expect(restarts).toBe(0);
  });

  it('считает ошибки 5xx повторяемыми', async () => {
    server.use(http.get(`${BASE}/api/item`, () => new HttpResponse(null, { status: 503 })));

    const error = await captureError(request('/api/item', itemSchema));

    expect(error).toMatchObject({ kind: 'http', status: 503 });
    expect(error.isRetryable).toBe(true);
  });

  it('обрывает долгий запрос по таймауту', async () => {
    server.use(
      http.get(`${BASE}/api/item`, async () => {
        await delay('infinite');
        return HttpResponse.json({ id: 'never' });
      }),
    );

    const error = await captureError(request('/api/item', itemSchema, { timeoutMs: 50 }));

    expect(error.kind).toBe('timeout');
  });

  it('отличает отмену запроса от таймаута', async () => {
    server.use(
      http.get(`${BASE}/api/item`, async () => {
        await delay('infinite');
        return HttpResponse.json({ id: 'never' });
      }),
    );
    const controller = new AbortController();

    const pending = captureError(request('/api/item', itemSchema, { signal: controller.signal }));
    controller.abort();

    expect((await pending).kind).toBe('aborted');
  });

  it('принимает пустой ответ 204 в requestVoid и отправляет JSON', async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/api/feedback`, async ({ request: incoming }) => {
        body = await incoming.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(
      requestVoid('/api/feedback', { method: 'POST', json: { useful: true } }),
    ).resolves.toBeUndefined();
    expect(body).toEqual({ useful: true });
  });
});

describe('buildUrl', () => {
  it('пропускает пустые значения и кодирует кириллицу', () => {
    expect(
      buildUrl('https://api.test', '/api/x', {
        q: 'склад',
        cursor: null,
        empty: '',
        none: undefined,
      }),
    ).toBe('https://api.test/api/x?q=%D1%81%D0%BA%D0%BB%D0%B0%D0%B4');
  });
});

describe('моки отключились', () => {
  afterEach(() => {
    mockStatus.restart = undefined;
  });

  it('перезапускает моки и повторяет запрос, если пришёл не JSON', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/api/items/1`, () => {
        calls += 1;
        return calls === 1
          ? new HttpResponse('<!doctype html>', { headers: { 'Content-Type': 'text/html' } })
          : HttpResponse.json({ id: '1' });
      }),
    );
    let restarts = 0;
    mockStatus.restart = () => {
      restarts += 1;
      return Promise.resolve();
    };

    await expect(request('/api/items/1', itemSchema)).resolves.toEqual({ id: '1' });
    expect(restarts).toBe(1);
    expect(calls).toBe(2);
  });

  it('не трогает ответы 204 и JSON-ошибки моков', async () => {
    server.use(
      http.post(`${BASE}/api/feedback`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${BASE}/api/items/2`, () =>
        HttpResponse.json({ code: 'not_found', message: 'Нет такого' }, { status: 404 }),
      ),
    );
    let restarts = 0;
    mockStatus.restart = () => {
      restarts += 1;
      return Promise.resolve();
    };

    await requestVoid('/api/feedback', { method: 'POST' });
    const error = await captureError(request('/api/items/2', itemSchema));

    expect(error.status).toBe(404);
    expect(restarts).toBe(0);
  });

  it('без моков ответ не JSON — ошибка формата, без повторов', async () => {
    server.use(
      http.get(
        `${BASE}/api/items/3`,
        () => new HttpResponse('<!doctype html>', { headers: { 'Content-Type': 'text/html' } }),
      ),
    );

    const error = await captureError(request('/api/items/3', itemSchema));

    expect(error.kind).toBe('parse');
  });
});

describe('CSRF', () => {
  it('изменяющий запрос несёт токен, чтение — нет; токен берётся один раз', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get(`${BASE}/api/item`, ({ request: req }) => {
        seen.push(req.headers.get('X-CSRF-TOKEN'));
        return HttpResponse.json({ id: '1' });
      }),
      http.post(`${BASE}/api/item`, ({ request: req }) => {
        seen.push(req.headers.get('X-CSRF-TOKEN'));
        return HttpResponse.json({ id: '1' });
      }),
    );

    await request('/api/item', itemSchema);
    await request('/api/item', itemSchema, { method: 'POST', json: {} });
    await request('/api/item', itemSchema, { method: 'POST', json: {} });

    expect(seen).toEqual([null, 'token-1', 'token-1']);
    expect(csrfIssued).toBe(1);
  });

  it('устаревший токен: берёт новый и повторяет запрос один раз', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.post(`${BASE}/api/item`, ({ request: req }) => {
        const token = req.headers.get('X-CSRF-TOKEN');
        seen.push(token);
        return token === 'token-2'
          ? HttpResponse.json({ id: '1' })
          : HttpResponse.json(
              { type: '/problems/invalid-csrf-token', title: 'Неверный CSRF-токен', status: 403 },
              { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
            );
      }),
    );

    await expect(request('/api/item', itemSchema, { method: 'POST', json: {} })).resolves.toEqual({
      id: '1',
    });
    expect(seen).toEqual(['token-1', 'token-2']);
  });
});
