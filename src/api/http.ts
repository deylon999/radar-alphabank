import type { z } from 'zod';

import { apiErrorBodySchema } from '../schemas/common';
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

function toApiError(error: unknown, timeoutSignal: AbortSignal): ApiError {
  if (timeoutSignal.aborted) {
    return new ApiError({ kind: 'timeout', message: 'Сервер не ответил вовремя', cause: error });
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({ kind: 'aborted', message: 'Запрос отменён', cause: error });
  }
  return new ApiError({ kind: 'network', message: 'Нет связи с сервером', cause: error });
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const parsed = apiErrorBodySchema.safeParse(await response.json());
    return parsed.success ? parsed.data.message : response.statusText;
  } catch {
    return response.statusText;
  }
}

/** Моки отвечают JSON или 204. Что-то другое — ответ сервера сайта, мимо моков. */
function missedMocks(response: Response): boolean {
  const isJson = response.headers.get('Content-Type')?.includes('application/json') ?? false;
  return response.status !== 204 && !isJson;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', query, json, formData, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const headers = new Headers({ Accept: 'application/json' });
  let body: BodyInit | undefined;
  if (formData) {
    body = formData;
  } else if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const url = buildUrl(options.baseUrl ?? apiConfig.apiUrl, path, query);
  const fetchOnce = async () => {
    try {
      return await fetch(url, {
        method,
        headers,
        body,
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
    throw new ApiError({
      kind: 'http',
      status: response.status,
      message: await readErrorMessage(response),
    });
  }
  return response;
}

/** Запрос с ответом JSON, который проверяется zod-схемой. */
export async function request<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  options: RequestOptions = {},
): Promise<z.infer<Schema>> {
  const response = await send(path, options);
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
