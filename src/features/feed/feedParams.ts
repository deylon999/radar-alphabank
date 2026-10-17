import {
  EVENT_STAGES,
  type EventStage,
  INSIGHT_KINDS,
  type InsightFilters,
  type InsightKind,
  type Urgency,
  URGENCIES,
} from '../../schemas/insight';

export type FeedTab = 'main' | 'watch';

/** Состояние ленты, которое живёт в адресе страницы. */
export interface FeedParams {
  tab: FeedTab;
  kind: InsightKind[];
  urgency: Urgency[];
  stage: EventStage[];
  q: string;
}

export const DEFAULT_FEED_PARAMS: FeedParams = {
  tab: 'main',
  kind: [],
  urgency: [],
  stage: [],
  q: '',
};

/** Оставляет только допустимые значения, без повторов и в порядке enum. */
function readList<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]) {
  const values = new Set(params.getAll(key));
  return allowed.filter((value) => values.has(value));
}

export function parseFeedParams(params: URLSearchParams): FeedParams {
  return {
    tab: params.get('tab') === 'watch' ? 'watch' : 'main',
    kind: readList(params, 'kind', INSIGHT_KINDS),
    urgency: readList(params, 'urgency', URGENCIES),
    stage: readList(params, 'stage', EVENT_STAGES),
    q: params.get('q')?.trim() ?? '',
  };
}

/** Значения по умолчанию в адрес не пишутся: чистая лента — это просто «/». */
export function serializeFeedParams(feed: FeedParams): URLSearchParams {
  const params = new URLSearchParams();
  if (feed.tab !== 'main') params.set('tab', feed.tab);
  for (const kind of feed.kind) params.append('kind', kind);
  for (const urgency of feed.urgency) params.append('urgency', urgency);
  for (const stage of feed.stage) params.append('stage', stage);
  if (feed.q.trim()) params.set('q', feed.q.trim());
  return params;
}

/** «Главное» — прямая связь с компанией, «Под наблюдением» — возможная. */
export function toInsightFilters(feed: FeedParams): InsightFilters {
  return {
    relevance: feed.tab === 'main' ? 'direct' : 'possible',
    ...(feed.kind.length ? { kind: feed.kind } : {}),
    ...(feed.urgency.length ? { urgency: feed.urgency } : {}),
    ...(feed.stage.length ? { stage: feed.stage } : {}),
    ...(feed.q ? { q: feed.q } : {}),
  };
}

/** Сколько фильтров включено — для «Сбросить» и счётчика на телефоне. Вкладка не считается. */
export function countActiveFilters(feed: FeedParams): number {
  return feed.kind.length + feed.urgency.length + feed.stage.length + (feed.q ? 1 : 0);
}
