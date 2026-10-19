import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AskBody, FeedbackBody, InsightFilters, InsightStatus } from '../../schemas/insight';
import {
  askInsight,
  fetchDigest,
  fetchInsight,
  fetchInsights,
  sendInsightFeedback,
  updateInsightStatus,
} from '../endpoints/insights';
import { queryKeys } from '../queryKeys';

const FIRST_PAGE: string | null = null;

/** Лента с подгрузкой «Показать ещё» по курсору. */
export function useInsightFeed(companyId: string, filters: InsightFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.insights.list(companyId, filters),
    queryFn: ({ pageParam, signal }) => fetchInsights(companyId, filters, pageParam, signal),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useDigest(companyId: string) {
  return useQuery({
    queryKey: queryKeys.insights.digest(companyId),
    queryFn: ({ signal }) => fetchDigest(companyId, signal),
  });
}

export function useInsight(insightId: string) {
  return useQuery({
    queryKey: queryKeys.insights.detail(insightId),
    queryFn: ({ signal }) => fetchInsight(insightId, signal),
  });
}

/** Прочитано / скрыто / вернуть в ленту. Обновляет карточку, ленты и сводку компании. */
export function useUpdateInsightStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    // Изменения статуса идут строго по очереди: «Отменить» не обгонит «Скрыть».
    scope: { id: 'insight-status' },
    mutationFn: ({ insightId, status }: { insightId: string; status: InsightStatus }) =>
      updateInsightStatus(insightId, status),
    onSuccess: (insight) => {
      queryClient.setQueryData(queryKeys.insights.detail(insight.id), insight);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.insights.lists(insight.companyId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.insights.digest(insight.companyId) }),
      ]);
    },
  });
}

export function useSendInsightFeedback(insightId: string) {
  return useMutation({
    mutationFn: (body: FeedbackBody) => sendInsightFeedback(insightId, body),
  });
}

/** Уточняющий вопрос по инсайту: ответы не кешируются, каждый вопрос — новый запрос. */
export function useAskInsight(insightId: string) {
  return useMutation({
    mutationFn: (body: AskBody) => askInsight(insightId, body),
  });
}
