import type { z } from 'zod';

import { apiErrorBodySchema } from '../../schemas/common';
import {
  type Answer,
  answerSchema,
  type AskBody,
  type Digest,
  digestSchema,
  type FeedbackBody,
  type Insight,
  type InsightFilters,
  type InsightList,
  insightListSchema,
  insightSchema,
  type InsightStatus,
  type TraceStep,
  traceStepSchema,
  type Overview,
  overviewSchema,
} from '../../schemas/insight';
import type { UserRole } from '../../schemas/user';
import { ApiError } from '../ApiError';
import { isEventStream, parseJson, request, requestVoid, send, toApiError } from '../http';
import { readEventStream } from '../sse';

const insightPath = (insightId: string) => `/api/insights/${encodeURIComponent(insightId)}`;

export function fetchInsights(
  companyId: string,
  filters: InsightFilters,
  cursor: string | null,
  signal?: AbortSignal,
  role?: UserRole,
): Promise<InsightList> {
  return request(`/api/companies/${encodeURIComponent(companyId)}/insights`, insightListSchema, {
    signal,
    query: {
      kind: filters.kind,
      urgency: filters.urgency,
      stage: filters.stage,
      relevance: filters.relevance,
      q: filters.q?.trim(),
      role,
      cursor,
    },
  });
}

export function fetchDigest(companyId: string, signal?: AbortSignal): Promise<Digest> {
  return request(`/api/companies/${encodeURIComponent(companyId)}/digest`, digestSchema, {
    signal,
  });
}

export function fetchOverview(companyId: string, signal?: AbortSignal): Promise<Overview> {
  return request(`/api/companies/${encodeURIComponent(companyId)}/overview`, overviewSchema, {
    signal,
  });
}

export function fetchInsight(insightId: string, signal?: AbortSignal): Promise<Insight> {
  return request(insightPath(insightId), insightSchema, { signal });
}

export function updateInsightStatus(insightId: string, status: InsightStatus): Promise<Insight> {
  return request(insightPath(insightId), insightSchema, {
    method: 'PATCH',
    json: { status },
  });
}

export function sendInsightFeedback(insightId: string, body: FeedbackBody): Promise<void> {
  return requestVoid(`${insightPath(insightId)}/feedback`, { method: 'POST', json: body });
}

export interface AskOptions {
  signal?: AbortSignal;
  /** Шаг агента, пока он готовит ответ. Вызывается, только если бэкенд шлёт поток. */
  onStep?: (step: TraceStep) => void;
}

const parseEvent = <Schema extends z.ZodType>(schema: Schema, data: string): z.infer<Schema> => {
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch (error) {
    throw new ApiError({ kind: 'parse', message: 'Событие потока — не JSON', cause: error });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError({
      kind: 'parse',
      message: 'Событие потока не совпадает с контрактом',
      cause: parsed.error,
    });
  }
  return parsed.data;
};

/**
 * Ответ готовит агент: он ходит в инструменты, поэтому таймаут больше обычного. Если бэкенд
 * умеет, он шлёт поток событий: шаги агента по мере работы и в конце ответ. Если нет —
 * обычный JSON с ответом, и шагов просто не будет.
 */
export async function askInsight(
  insightId: string,
  body: AskBody,
  { signal, onStep }: AskOptions = {},
): Promise<Answer> {
  const response = await send(`${insightPath(insightId)}/ask`, {
    method: 'POST',
    json: body,
    signal,
    accept: 'text/event-stream, application/json',
    timeoutMs: 60_000,
  });
  if (!isEventStream(response) || !response.body) {
    return parseJson(response, answerSchema);
  }

  try {
    for await (const { event, data } of readEventStream(response.body)) {
      if (event === 'step') {
        onStep?.(parseEvent(traceStepSchema, data));
      } else if (event === 'answer') {
        return parseEvent(answerSchema, data);
      } else if (event === 'error') {
        throw new ApiError({ kind: 'http', message: parseEvent(apiErrorBodySchema, data).message });
      }
    }
  } catch (error) {
    throw toApiError(error);
  }
  throw new ApiError({ kind: 'network', message: 'Ответ оборвался до конца' });
}
