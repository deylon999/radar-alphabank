import type { Company, FactCategory, ProfileFact } from '../schemas/company';
import type { QualityMetrics } from '../schemas/quality';
import {
  type Answer,
  type Citation,
  type Digest,
  type Insight,
  type InsightBrief,
  type InsightFilters,
  type Overview,
  TOPICS,
  type TraceStep,
} from '../schemas/insight';
import { typograph } from '../shared/lib/typography';
import type { MockDb } from './db';

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

const toBrief = ({
  id,
  kind,
  urgency,
  relevance,
  status,
  title,
  updatedAt,
}: Insight): InsightBrief => ({
  id,
  kind,
  urgency,
  relevance,
  status,
  title,
  updatedAt,
});

function riskWeight(insights: readonly InsightBrief[]): [urgent: number, risks: number] {
  const risks = insights.filter((insight) => insight.kind === 'risk');
  return [risks.filter((insight) => insight.urgency === 'urgent').length, risks.length];
}

/**
 * Обзор: скрытые не входят. Темы — сначала с большим числом срочных рисков, потом рисков
 * вообще, потом больших; материалы — свежие сверху, устаревшие в конце.
 */
export function computeOverview(items: readonly Insight[]): Overview {
  const active = items.filter((insight) => insight.status !== 'dismissed').sort(compareInsights);

  const topics = TOPICS.map((topic) => ({
    topic,
    insights: active.filter((insight) => insight.topic === topic).map(toBrief),
  }))
    .filter((group) => group.insights.length > 0)
    .sort((a, b) => {
      const [urgentA, risksA] = riskWeight(a.insights);
      const [urgentB, risksB] = riskWeight(b.insights);
      return urgentB - urgentA || risksB - risksA || b.insights.length - a.insights.length;
    });

  const materials = new Map<string, Overview['materials'][number]>();
  for (const insight of active) {
    if (!insight.bankView) continue;
    const { id, title, publishedAt, outdated } = insight.bankView.material;
    const material = { id, title, publishedAt, ...(outdated ? { outdated } : {}) };
    const group = materials.get(material.id) ?? { material, insights: [] };
    group.insights.push(toBrief(insight));
    materials.set(material.id, group);
  }

  return {
    topics,
    materials: [...materials.values()].sort(
      (a, b) =>
        Number(a.material.outdated ?? false) - Number(b.material.outdated ?? false) ||
        Date.parse(b.material.publishedAt) - Date.parse(a.material.publishedAt),
    ),
  };
}

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
/**
 * Шаги, по которым мок собирает ответ, — ровно то, что делает answerQuestion: смотрит
 * аналитику банка, признаки клиента и новость. Настоящие шаги присылает агент бэкенда.
 */
export function answerSteps(insight: Insight): TraceStep[] {
  const bank = insight.bankView;
  const source = insight.sources[0];
  const steps: TraceStep[] = [
    { kind: 'plan', title: 'Разбираю вопрос: нужны аналитика банка, данные компании и новости' },
    bank && !bank.material.outdated
      ? { kind: 'tool', title: 'Аналитика банка', detail: bank.material.title }
      : { kind: 'tool', title: 'Аналитика банка', detail: 'свежего материала по теме нет' },
  ];
  if (insight.signals?.length) {
    steps.push({
      kind: 'tool',
      title: 'Профиль клиента',
      detail: insight.signals.map((signal) => signal.value).join('; '),
    });
  }
  if (source) {
    steps.push({ kind: 'tool', title: 'Новости', detail: source.title });
  }
  steps.push({
    kind: 'check',
    title: bank?.material.outdated
      ? 'Материал банка устарел — в ответе на него не опираюсь'
      : 'Сверяю ответ с источниками',
  });
  return steps.map((step) => ({
    ...step,
    title: typograph(step.title),
    ...(step.detail ? { detail: typograph(step.detail) } : {}),
  }));
}

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

export const COMPANY_SEARCH_LIMIT = 20;

/**
 * Поиск клиента: по ID, отрасли, коду ОКВЭД, региону и городу. Без запроса — крупнейшие
 * по выручке. Регистр и «ё» не важны.
 */
export function searchCompanies(companies: readonly Company[], query: string): Company[] {
  const normalize = (text: string) => text.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е');
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const byRevenue = [...companies].sort(
    (a, b) => (b.profile?.revenue ?? 0) - (a.profile?.revenue ?? 0),
  );
  const matches = byRevenue.filter((company) => {
    const haystack = normalize(
      [
        company.id,
        company.name,
        company.industry,
        company.profile?.okved.code ?? '',
        company.profile?.okved.name ?? '',
        company.profile?.region ?? '',
        company.profile?.city ?? '',
      ].join(' '),
    );
    return words.every((word) => haystack.includes(word));
  });
  return matches.slice(0, COMPANY_SEARCH_LIMIT);
}

const RECENT_LIMIT = 10;
const MINUTE_MS = 60_000;

/** Перцентиль по ближайшему рангу: для p90 из 21 значения — 19-е по возрастанию. */
function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
}

const newestFirst = <T extends { at: string }>(items: readonly T[]): T[] =>
  items.toSorted((a, b) => Date.parse(b.at) - Date.parse(a.at));

/** Метрики качества по всем клиентам: что из выводов полезно, что скрывают, о чём спрашивают. */
export function computeQualityMetrics(db: MockDb, now: number): QualityMetrics {
  const byId = new Map(db.insights.map((insight) => [insight.id, insight]));
  const titleOf = (insightId: string) => byId.get(insightId)?.title ?? insightId;

  const latestVote = new Map<string, boolean>();
  for (const entry of db.feedback.toSorted((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    latestVote.set(entry.insightId, entry.useful);
  }
  const votes = [...latestVote.values()];

  // Реакция — от последнего сигнала, вышедшего до вывода: новости или материала банка.
  const reactions = db.insights
    .flatMap((insight) => {
      const created = Date.parse(insight.createdAt);
      const inputs = [
        ...insight.sources.map((source) => source.publishedAt),
        ...(insight.bankView ? [insight.bankView.material.publishedAt] : []),
      ]
        .map((iso) => Date.parse(iso))
        .filter((at) => at <= created);
      return inputs.length > 0 ? [Math.round((created - Math.max(...inputs)) / MINUTE_MS)] : [];
    })
    .toSorted((a, b) => a - b);

  return {
    generatedAt: new Date(now).toISOString(),
    insights: db.insights.length,
    engagement: {
      read: db.insights.filter((insight) => insight.status === 'read').length,
      dismissed: db.insights.filter((insight) => insight.status === 'dismissed').length,
      questions: db.questions.length,
    },
    feedback: {
      useful: votes.filter(Boolean).length,
      notUseful: votes.filter((useful) => !useful).length,
      comments: newestFirst(db.feedback)
        .flatMap(({ insightId, useful, comment, at }) =>
          comment ? [{ insightId, insightTitle: titleOf(insightId), useful, comment, at }] : [],
        )
        .slice(0, RECENT_LIMIT),
    },
    completeness: {
      withBankView: db.insights.filter(
        (insight) => insight.bankView && !insight.bankView.material.outdated,
      ).length,
      withSignals: db.insights.filter((insight) => (insight.signals ?? []).length > 0).length,
      withSelfCheck: db.insights.filter((insight) =>
        (insight.trace ?? []).some((step) => step.kind === 'check'),
      ).length,
      withChecks: db.insights.filter((insight) => insight.checks.length > 0).length,
      outdatedBankView: db.insights.filter((insight) => insight.bankView?.material.outdated).length,
    },
    reactionMinutes: { median: percentile(reactions, 50), p90: percentile(reactions, 90) },
    topics: TOPICS.map((topic) => {
      const own = db.insights.filter((insight) => insight.topic === topic);
      const ownVotes = own.flatMap((insight) => {
        const vote = latestVote.get(insight.id);
        return vote === undefined ? [] : [vote];
      });
      return {
        topic,
        insights: own.length,
        useful: ownVotes.filter(Boolean).length,
        notUseful: ownVotes.filter((useful) => !useful).length,
        dismissed: own.filter((insight) => insight.status === 'dismissed').length,
      };
    }).filter((row) => row.insights > 0),
    questions: newestFirst(db.questions)
      .slice(0, RECENT_LIMIT)
      .map(({ insightId, question, at }) => ({
        insightId,
        insightTitle: titleOf(insightId),
        question,
        at,
      })),
  };
}
