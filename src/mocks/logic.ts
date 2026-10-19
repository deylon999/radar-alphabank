import type { FactCategory, ProfileFact } from '../schemas/company';
import type { Digest, Insight, InsightFilters } from '../schemas/insight';
import { typograph } from '../shared/lib/typography';

/** Небольшая страница, чтобы в демо было видно «Показать ещё». */
export const PAGE_SIZE = 4;
const DIGEST_PERIOD_DAYS = 7;

function matchesQuery(insight: Insight, query: string): boolean {
  const haystack = [
    insight.title,
    insight.whyItMatters,
    insight.event.title,
    insight.event.place ?? '',
    ...insight.impactPath.map((step) => step.label),
  ]
    .join(' ')
    .toLocaleLowerCase('ru-RU');
  return haystack.includes(query.toLocaleLowerCase('ru-RU'));
}

/** Скрытые инсайты в ленту не попадают. Значения одного фильтра — «или», разные фильтры — «и». */
export function filterInsights(items: readonly Insight[], filters: InsightFilters): Insight[] {
  const query = filters.q?.trim() ?? '';
  return items.filter(
    (insight) =>
      insight.status !== 'dismissed' &&
      (!filters.kind?.length || filters.kind.includes(insight.kind)) &&
      (!filters.urgency?.length || filters.urgency.includes(insight.urgency)) &&
      (!filters.stage?.length || filters.stage.includes(insight.event.stage)) &&
      (!filters.relevance || filters.relevance === insight.relevance) &&
      (query === '' || matchesQuery(insight, query)),
  );
}

/** Порядок ленты: сначала срочные, затем по дате обновления — новые выше. */
export function compareInsights(a: Insight, b: Insight): number {
  const urgentA = a.urgency === 'urgent' ? 0 : 1;
  const urgentB = b.urgency === 'urgent' ? 0 : 1;
  if (urgentA !== urgentB) {
    return urgentA - urgentB;
  }
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

const CURSOR_PREFIX = 'offset:';

export function paginate<T>(
  items: readonly T[],
  cursor: string | null,
  pageSize = PAGE_SIZE,
): { items: T[]; nextCursor: string | null } | undefined {
  let offset = 0;
  if (cursor !== null) {
    offset = Number(cursor.slice(CURSOR_PREFIX.length));
    if (!cursor.startsWith(CURSOR_PREFIX) || !Number.isInteger(offset) || offset < 0) {
      return undefined;
    }
  }
  const end = offset + pageSize;
  return {
    items: items.slice(offset, end),
    nextCursor: end < items.length ? `${CURSOR_PREFIX}${String(end)}` : null,
  };
}

/**
 * Сводка за 7 дней по вкладке «Главное» (прямая связь). `risks` включает срочные —
 * так число совпадает с лентой при фильтре «Риски».
 */
export function computeDigest(items: readonly Insight[], now: number): Digest {
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - DIGEST_PERIOD_DAYS);
  const recent = items.filter(
    (insight) =>
      insight.status !== 'dismissed' &&
      insight.relevance === 'direct' &&
      Date.parse(insight.updatedAt) >= since.getTime(),
  );
  const risks = recent.filter((insight) => insight.kind === 'risk');
  return {
    since: since.toISOString(),
    urgentRisks: risks.filter((insight) => insight.urgency === 'urgent').length,
    risks: risks.length,
    opportunities: recent.filter((insight) => insight.kind === 'opportunity').length,
  };
}

const CATEGORY_RULES: [FactCategory, RegExp][] = [
  ['supplier', /поставщ|поставля|закупа/i],
  ['customer', /клиент|покупател|продаём|продаж/i],
  ['logistics', /достав|логист|перевоз|отгруж|маршрут/i],
  ['site', /склад|завод|площадк|магазин|элеватор|цех|офис/i],
  ['finance', /кредит|лизинг|выручк|себестоим|₽|руб/i],
  ['product', /продукц|ассортимент|выпуска|производ/i],
  ['region', /област|край|район|регион|город/i],
];

export function guessFactCategory(statement: string): FactCategory {
  return CATEGORY_RULES.find(([, rule]) => rule.test(statement))?.[0] ?? 'other';
}

const MAX_TEXT_FACTS = 5;
const MIN_SENTENCE_LENGTH = 20;

/** Упрощённое «извлечение» фактов из описания: каждое содержательное предложение — факт. */
export function extractTextFacts(text: string, makeId: () => string): ProfileFact[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim().replace(/[.!?]+$/, ''))
    .filter((sentence) => sentence.length >= MIN_SENTENCE_LENGTH)
    .slice(0, MAX_TEXT_FACTS)
    .map((sentence) => ({
      id: makeId(),
      category: guessFactCategory(sentence),
      statement: typograph(sentence),
      status: 'pending',
      source: { kind: 'text', label: 'Описание компании' },
    }));
}
