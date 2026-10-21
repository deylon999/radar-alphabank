import { Button } from '@alfalab/core-components/button/modern';
import { useEffect, useRef } from 'react';

import { useInsightFeed } from '../../api/hooks/insights';
import type { Insight } from '../../schemas/insight';
import { QueryView } from '../../shared/ui/QueryView';
import { countActiveFilters, type FeedParams, toInsightFilters } from './feedParams';
import { FeedEmpty } from './FeedEmpty';
import styles from './FeedList.module.css';
import { InsightCard } from './InsightCard/InsightCard';
import { InsightCardSkeleton } from './InsightCard/InsightCardSkeleton';
import { useHideInsight } from './useHideInsight';

interface FeedListProps {
  companyId: string;
  params: FeedParams;
  onResetFilters: () => void;
}

const SKELETON_CARDS = 5;

const feedSkeleton = (
  <div className={styles.list} aria-busy="true" aria-label="Загрузка ленты">
    {Array.from({ length: SKELETON_CARDS }, (_, index) => (
      <InsightCardSkeleton key={index} />
    ))}
  </div>
);

export function FeedList({ companyId, params, onResetFilters }: FeedListProps) {
  const feed = useInsightFeed(companyId, toInsightFilters(params));
  const hide = useHideInsight(companyId);
  const listRef = useRef<HTMLUListElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const items = feed.data?.pages.flatMap((page) => page.items);

  // После «Скрыть» фокус переходит на соседнюю карточку, а не теряется.
  useEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    pendingFocus.current = null;
    const links = listRef.current?.querySelectorAll<HTMLElement>('[data-card-link]');
    links?.[Math.min(index, links.length - 1)]?.focus();
  }, [items]);

  const handleHide = (insight: Insight) => {
    pendingFocus.current = items?.findIndex((item) => item.id === insight.id) ?? null;
    hide(insight);
  };

  return (
    <QueryView
      query={{ ...feed, data: items }}
      skeleton={feedSkeleton}
      errorTitle="Не удалось загрузить ленту"
      isEmpty={(list) => list.length === 0}
      empty={
        <FeedEmpty
          tab={params.tab}
          hasFilters={countActiveFilters(params) > 0}
          onResetFilters={onResetFilters}
        />
      }
    >
      {(list) => (
        <>
          <ul ref={listRef} className={styles.list}>
            {list.map((insight) => (
              <li key={insight.id}>
                <InsightCard insight={insight} onHide={handleHide} />
              </li>
            ))}
          </ul>
          {feed.isFetchNextPageError ? (
            <p className={styles.more} role="alert">
              Не удалось загрузить ещё.{' '}
              <Button view="text" size={32} onClick={() => void feed.fetchNextPage()}>
                Повторить
              </Button>
            </p>
          ) : null}
          {feed.hasNextPage && !feed.isFetchNextPageError ? (
            <div className={styles.more}>
              <Button
                view="secondary"
                size={40}
                loading={feed.isFetchingNextPage}
                onClick={() => void feed.fetchNextPage()}
              >
                Показать ещё
              </Button>
            </div>
          ) : null}
        </>
      )}
    </QueryView>
  );
}
