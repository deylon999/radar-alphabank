import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  Answer,
  AskBody,
  FeedbackBody,
  InsightFilters,
  InsightStatus,
  TraceStep,
} from '../../schemas/insight';
import {
  askInsight,
  fetchDigest,
  fetchInsight,
  fetchInsights,
  fetchOverview,
  sendInsightFeedback,
  updateInsightStatus,
} from '../endpoints/insights';
import { useUserRole } from '../../shared/lib/userRole';
import { queryKeys } from '../queryKeys';

const FIRST_PAGE: string | null = null;

/** Лента с подгрузкой «Показать ещё» по курсору. */
export function useInsightFeed(companyId: string, filters: InsightFilters) {
  const [role] = useUserRole();
  return useInfiniteQuery({
    queryKey: [...queryKeys.insights.list(companyId, filters), { role }],
    queryFn: ({ pageParam, signal }) => fetchInsights(companyId, filters, pageParam, signal, role),
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

export function useOverview(companyId: string) {
  return useQuery({
    queryKey: queryKeys.insights.overview(companyId),
    queryFn: ({ signal }) => fetchOverview(companyId, signal),
  });
}

export function useInsight(insightId: string) {
  return useQuery({
    queryKey: queryKeys.insights.detail(insightId),
    queryFn: ({ signal }) => fetchInsight(insightId, signal),
  });
}

/** Прочитано / скрыто / вернуть в ленту. Обновляет карточку, ленты, сводку и обзор компании. */
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
        queryClient.invalidateQueries({ queryKey: queryKeys.insights.overview(insight.companyId) }),
      ]);
    },
  });
}

export function useSendInsightFeedback(insightId: string) {
  return useMutation({
    mutationFn: (body: FeedbackBody) => sendInsightFeedback(insightId, body),
  });
}

export interface AskResult {
  answer: Answer;
  /** Шаги агента, пришедшие по ходу ответа; пусто, если бэкенд не шлёт поток. */
  steps: TraceStep[];
}

/**
 * Уточняющий вопрос по инсайту: ответы не кешируются, каждый вопрос — новый запрос.
 * Пока агент работает, `steps` растёт по мере его шагов; `cancel` прерывает ожидание.
 */
export function useAskInsight(insightId: string) {
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const controllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (body: AskBody): Promise<AskResult> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const received: TraceStep[] = [];
      const answer = await askInsight(insightId, body, {
        signal: controller.signal,
        onStep: (step) => {
          received.push(step);
          setSteps([...received]);
        },
      });
      return { answer, steps: received };
    },
    // Шаги готового ответа живут в нём самом; живой список нужен только на время ожидания.
    onSettled: () => {
      setSteps([]);
    },
  });

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const { reset } = mutation;
  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    reset();
    setSteps([]);
  }, [reset]);

  return { ...mutation, steps, cancel };
}
