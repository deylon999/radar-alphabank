import type { FactCategory, ProfileFact } from '../schemas/company';
import type { Answer, Citation, Digest, Insight, InsightFilters } from '../schemas/insight';
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

/** «У компании…» → «у компании…» после двоеточия; аббревиатуры («ЦБ», «U_9250») не трогаем. */
function lowerFirst(text: string): string {
  const [first = '', second = ''] = text;
  return second === second.toLocaleLowerCase('ru-RU')
    ? first.toLocaleLowerCase('ru-RU') + text.slice(1)
    : text;
}

const dayMonthYear = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Упрощённый ответ на уточняющий вопрос: собирается из полей инсайта и всегда ссылается на
 * них. Настоящий ответ готовит агент бэкенда по аналитике банка и данным клиента.
 */
export function answerQuestion(insight: Insight, question: string): Answer {
  const citations: Citation[] = [];
  const parts: string[] = [];
  const bank = insight.bankView;

  if (bank && !bank.material.outdated) {
    const date = dayMonthYear.format(new Date(bank.material.publishedAt)).replace(/\s?г\.$/, '');
    parts.push(`Позиция Альфа-Банка: ${lowerFirst(bank.summary.replace(/\.$/, ''))}.`);
    citations.push({
      kind: 'bank',
      label: `${bank.material.title}, ${date}${bank.material.page ? `, с. ${String(bank.material.page)}` : ''}`,
    });
  } else {
    parts.push(
      'Свежей аналитики Альфа-Банка по этой теме нет, поэтому ответ опирается на новости.',
    );
  }
  parts.push(`Для вашей компании: ${lowerFirst(insight.whyItMatters.replace(/\.$/, ''))}.`);
  parts.push(
    `Возможное последствие (гипотеза): ${lowerFirst(insight.consequence.replace(/\.$/, ''))}.`,
  );
  const firstCheck = insight.checks[0];
  if (firstCheck) {
    parts.push(`Что сделать в первую очередь: ${lowerFirst(firstCheck.replace(/\.$/, ''))}.`);
  }

  if (insight.signals?.length) {
    citations.push({
      kind: 'client',
      label: insight.signals.map((signal) => `${signal.label}: ${signal.value}`).join('; '),
    });
  }
  const source = insight.sources[0];
  if (source) {
    citations.push({ kind: 'news', label: source.title, url: source.url });
  }

  return { question: typograph(question.trim()), answer: typograph(parts.join(' ')), citations };
}
