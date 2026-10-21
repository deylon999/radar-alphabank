import type { ValidationIssue } from '../schemas/common';

export type ApiErrorKind =
  /** Сервер недоступен или нет соединения. */
  | 'network'
  /** Сервер не ответил за отведённое время. */
  | 'timeout'
  /** Запрос отменён (уход со страницы, смена фильтров). */
  | 'aborted'
  /** Сервер ответил кодом 4xx/5xx. */
  | 'http'
  /** Ответ не совпал с контрактом (zod). */
  | 'parse';

interface ApiErrorOptions {
  kind: ApiErrorKind;
  message: string;
  status?: number;
  /** `type` из Problem Details: по нему различают случаи, а не по тексту. */
  problemType?: string;
  /** Ошибки полей при 422 — для подсветки в форме. */
  issues?: ValidationIssue[];
  cause?: unknown;
}

/** Единая ошибка слоя api: компоненты различают только `kind` и `status`. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  readonly problemType: string | undefined;
  readonly issues: ValidationIssue[];

  constructor({ kind, message, status, problemType, issues = [], cause }: ApiErrorOptions) {
    super(message, { cause });
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.problemType = problemType;
    this.issues = issues;
  }

  /** Повтор имеет смысл при сбое сети, таймауте и ошибках сервера, но не при 4xx и битом формате. */
  get isRetryable(): boolean {
    if (this.kind === 'network' || this.kind === 'timeout') {
      return true;
    }
    return this.kind === 'http' && this.status !== undefined && this.status >= 500;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
