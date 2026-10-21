import { useEffect, useRef } from 'react';

import { useUpdateInsightStatus } from '../../api/hooks/insights';
import type { Insight } from '../../schemas/insight';

/**
 * Открытая карточка помечается прочитанной — один раз за открытие.
 * Ref защищает от повторного запроса при двойном вызове эффекта в StrictMode.
 */
export function useMarkInsightRead(insight: Insight | undefined) {
  const { mutate } = useUpdateInsightStatus();
  const marked = useRef<string | null>(null);

  useEffect(() => {
    if (insight?.status !== 'new' || marked.current === insight.id) {
      return;
    }
    marked.current = insight.id;
    mutate({ insightId: insight.id, status: 'read' });
  }, [insight, mutate]);
}
