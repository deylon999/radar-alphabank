import type { z } from 'zod';

import { csrfSchema } from '../schemas/auth';
import { type ProblemDetails, problemDetailsSchema, problemMessage } from '../schemas/common';
import { ApiError } from './ApiError';
import { apiConfig, mockStatus } from './config';

export const DEFAULT_TIMEOUT_MS = 15_000;

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Параметры адреса; массивы передаются повторяющимися ключами: `kind=risk&kind=opportunity`. */
  query?: Record<string, QueryValue | readonly QueryValue[]>;
  json?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Базовый адрес; по умолчанию VITE_API_URL. */
  baseUrl?: string;
  /** Заголовок Accept; по умолчанию JSON. */
  accept?: string;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const INVALID_CSRF = '/problems/invalid-csrf-token';

/**
 * CSRF-токен привязан к cookie сессии: берём его один раз и кладём в каждый изменяющий
 * запрос. После входа и выхода cookie меняется — токен сбрасывается и берётся заново.
 */
let csrf: Promise<{ token: string; headerName: string }> | undefined;

/** Сессия истекла посреди работы: каркас приложения подписывается и ведёт на вход. */
const unauthorizedListeners = new Set<() => void>();

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export function resetCsrf(): void {
  csrf = undefined;
}

function csrfToken(): Promise<{ token: string; headerName: string }> {
  csrf ??= request('/api/auth/csrf', csrfSchema).catch((error: unknown) => {
    csrf = undefined;
    throw error;
  });
  return csrf;
}

export function buildUrl(baseUrl: string, path: string, query: RequestOptions['query']): string {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, raw] of Object.entries(query ?? {})) {
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    }
  }
  return url.toString();
}

export function toApiError(error: unknown, timeoutSignal?: AbortSignal): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
  if (timeoutSignal?.aborted || isTimeout) {
    return new ApiError({ kind: 'timeout', message: 'Сервер не ответил вовремя', cause: error });
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({ kind: 'aborted', message: 'Запрос отменён', cause: error });
  }
  return new ApiError({ kind: 'network', message: 'Нет связи с сервером', cause: error });
}

async function readProblem(response: Response): Promise<ProblemDetails> {
  try {
    const parsed = problemDetailsSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** Ошибка сервера в формате Problem Details или прежнем `{ message }`. */
export function problemError(
  problem: ProblemDetails,
  status?: number,
  fallbackMessage = 'Ошибка сервера',
): ApiError {
  return new ApiError({
    kind: 'http',
    status: status ?? problem.status,
    message: problemMessage(problem) ?? fallbackMessage,
    problemType: problem.type,
    issues: problem.errors,
  });
}

const JSON_TYPE = /application\/(problem\+)?json/;

export function isEventStream(response: Response): boolean {
  return response.headers.get('Content-Type')?.includes('text/event-stream') ?? false;
}

/** Моки отвечают JSON, потоком событий или 204. Что-то другое — ответ сервера сайта. */
function missedMocks(response: Response): boolean {
  const isJson = JSON_TYPE.test(response.headers.get('Content-Type') ?? '');
  return response.status !== 204 && !isJson && !isEventStream(response);
}

export async function send(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', query, json, formData, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const headers = new Headers({ Accept: options.accept ?? 'application/json' });
  let body: BodyInit | undefined;
  if (formData) {
    body = formData;
  } else if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const url = buildUrl(options.baseUrl ?? apiConfig.apiUrl, path, query);
  const needsCsrf = !SAFE_METHODS.has(method);
  const fetchOnce = async () => {
    if (needsCsrf) {
      const { token, headerName } = await csrfToken();
      headers.set(headerName, token);
    }
    try {
      return await fetch(url, {
        method,
        headers,
        body,
        // Сессия — в cookie: при разработке API на другом адресе её надо передавать явно.
        credentials: 'include',
        signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
      });
    } catch (error) {
      throw toApiError(error, timeoutSignal);
    }
  };

  let response = await fetchOnce();
  // Моки отключились, и запрос ушёл на сервер сайта. До обработчиков он не дошёл,
  // поэтому повторить безопасно даже POST.
  if (mockStatus.restart && missedMocks(response)) {
    await mockStatus.restart();
    response = await fetchOnce();
  }

  if (!response.ok) {
    const problem = await readProblem(response);
    // Ошибки входа и проверки «кто я» разбирает сам вызывающий код.
    if (response.status === 401 && !path.startsWith('/api/auth/') && path !== '/api/me') {
      resetCsrf();
      unauthorizedListeners.forEach((listener) => {
        listener();
      });
    }
    // Токен устарел (сессия сменилась в другой вкладке) — берём новый и повторяем один раз.
    if (needsCsrf && response.status === 403 && problem.type === INVALID_CSRF) {
      resetCsrf();
      response = await fetchOnce();
      if (response.ok) {
        return response;
      }
      throw problemError(
        await readProblem(response),
        response.status,
        response.statusText || undefined,
      );
    }
    throw problemError(problem, response.status, response.statusText || undefined);
  }
  return response;
}

/** Запрос с ответом JSON, который проверяется zod-схемой. */
export async function request<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  options: RequestOptions = {},
): Promise<z.infer<Schema>> {
  return parseJson(await send(path, options), schema);
}

/** Тело ответа как JSON, проверенный схемой. */
export async function parseJson<Schema extends z.ZodType>(
  response: Response,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new ApiError({ kind: 'parse', message: 'Ответ сервера — не JSON', cause: error });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError({
      kind: 'parse',
      message: 'Ответ сервера не совпадает с контрактом',
      cause: parsed.error,
    });
  }
  return parsed.data;
}

/** Запрос без тела ответа (204 No Content). */
export async function requestVoid(path: string, options: RequestOptions = {}): Promise<void> {
  await send(path, options);
}
