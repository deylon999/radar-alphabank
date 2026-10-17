import {
  type Digest,
  digestSchema,
  type FeedbackBody,
  type Insight,
  type InsightFilters,
  type InsightList,
  insightListSchema,
  insightSchema,
  type InsightStatus,
} from '../../schemas/insight';
import { request, requestVoid } from '../http';

const insightPath = (insightId: string) => `/api/insights/${encodeURIComponent(insightId)}`;

export function fetchInsights(
  companyId: string,
  filters: InsightFilters,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<InsightList> {
  return request(`/api/companies/${encodeURIComponent(companyId)}/insights`, insightListSchema, {
    signal,
    query: {
      kind: filters.kind,
      urgency: filters.urgency,
      stage: filters.stage,
      relevance: filters.relevance,
      q: filters.q?.trim(),
      cursor,
    },
  });
}

export function fetchDigest(companyId: string, signal?: AbortSignal): Promise<Digest> {
  return request(`/api/companies/${encodeURIComponent(companyId)}/digest`, digestSchema, {
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
