import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useUpdateInsightStatus } from '../../api/hooks/insights';
import { queryKeys } from '../../api/queryKeys';
import type { Insight, InsightList } from '../../schemas/insight';
import { useToast } from '../../shared/ui/Toast/toastContext';

type FeedData = InfiniteData<InsightList, string | null>;

function withoutInsight(data: FeedData, insightId: string): FeedData {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== insightId),
    })),
  };
}

/**
 * «Скрыть»: карточка исчезает сразу, внизу — «Скрыто» с «Отменить».
 * Если сервер не принял изменение, карточка возвращается на место.
 */
export function useHideInsight(companyId: string) {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const { mutate } = useUpdateInsightStatus();

  return useCallback(
    (insight: Insight) => {
      const listsKey = queryKeys.insights.lists(companyId);
      const snapshot = queryClient.getQueriesData<FeedData>({ queryKey: listsKey });
      void queryClient.cancelQueries({ queryKey: listsKey });
      queryClient.setQueriesData<FeedData>({ queryKey: listsKey }, (data) =>
        data ? withoutInsight(data, insight.id) : data,
      );

      showToast({
        title: 'Скрыто',
        action: {
          label: 'Отменить',
          onClick: () => {
            mutate({ insightId: insight.id, status: insight.status });
          },
        },
      });

      mutate(
        { insightId: insight.id, status: 'dismissed' },
        {
          onError: () => {
            for (const [key, data] of snapshot) {
              queryClient.setQueryData(key, data);
            }
            showToast({ title: 'Не удалось скрыть. Попробуйте ещё раз' });
          },
        },
      );
    },
    [companyId, mutate, queryClient, showToast],
  );
}
