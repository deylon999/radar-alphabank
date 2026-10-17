import { isApiError } from '../../api/ApiError';
import { useInsight } from '../../api/hooks/insights';
import type { Insight } from '../../schemas/insight';
import { terms } from '../../shared/labels';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { ButtonLink } from '../../shared/ui/ButtonLink';
import { EmptyState } from '../../shared/ui/EmptyState';
import { QueryView } from '../../shared/ui/QueryView';
import { PageSkeleton } from '../../shared/ui/Skeleton/PageSkeleton';
import { Checklist } from './Checklist/Checklist';
import { Basis, Consequence } from './Consequence/Consequence';
import { Feedback } from './Feedback/Feedback';
import { ImpactChain } from './ImpactChain/ImpactChain';
import { InsightHeader } from './InsightHeader/InsightHeader';
import { RevisionHistory, Sources, Unknowns } from './InsightLists';
import styles from './InsightView.module.css';
import { useMarkInsightRead } from './useMarkInsightRead';
import { WhatHappened } from './WhatHappened';

/**
 * Разделы в порядке ТЗ. На десктопе «Что проверить» и «Обратная связь» — в правой
 * колонке, которая прилипает при прокрутке; на телефоне всё идёт одной колонкой.
 */
function InsightContent({ insight }: { insight: Insight }) {
  return (
    <article className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.header}>
          <InsightHeader insight={insight} />
        </div>
        <div className={styles.s1}>
          <WhatHappened insight={insight} />
        </div>
        <div className={styles.s2}>
          <ImpactChain insight={insight} />
        </div>
        <div className={styles.s3}>
          <Consequence insight={insight} />
        </div>
        <div className={styles.s4}>
          <Basis insight={insight} />
        </div>
        <div className={styles.s5}>
          <Unknowns insight={insight} />
        </div>
        <div className={styles.s7}>
          <Sources insight={insight} />
        </div>
        <div className={styles.s8}>
          <RevisionHistory insight={insight} />
        </div>
      </div>
      <div className={styles.aside}>
        <div className={styles.s6}>
          <Checklist insight={insight} />
        </div>
        <div className={styles.s9}>
          <Feedback insightId={insight.id} />
        </div>
      </div>
    </article>
  );
}

export function InsightView({ insightId }: { insightId: string }) {
  const query = useInsight(insightId);
  useDocumentTitle(query.data?.title ?? terms.insight);
  useMarkInsightRead(query.data);

  if (isApiError(query.error) && query.error.status === 404 && !query.data) {
    return (
      <EmptyState
        title="Инсайт не найден"
        description="Возможно, он устарел или был удалён. Актуальное — в ленте."
        action={
          <ButtonLink to="/" view="secondary" size={40}>
            Открыть ленту
          </ButtonLink>
        }
      />
    );
  }

  return (
    <QueryView
      query={query}
      skeleton={<PageSkeleton blocks={4} />}
      errorTitle="Не удалось загрузить инсайт"
    >
      {(insight) => <InsightContent insight={insight} />}
    </QueryView>
  );
}
