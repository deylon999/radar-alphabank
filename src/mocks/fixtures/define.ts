import type { ProfileFact } from '../../schemas/company';
import type { Insight, Source } from '../../schemas/insight';
import { typograph } from '../../shared/lib/typography';

const MINUTE = 60_000;

/**
 * Опорное «сейчас» моков — начало текущей минуты. Содержимое моков одинаково при каждом
 * запуске, а время отсчитывается от момента запуска, чтобы лента выглядела свежей.
 */
export const MOCK_NOW = Math.floor(Date.now() / MINUTE) * MINUTE;

export const minutesAgo = (minutes: number): string =>
  new Date(MOCK_NOW - minutes * MINUTE).toISOString();
export const hoursAgo = (hours: number): string => minutesAgo(hours * 60);
export const daysAgo = (days: number): string => hoursAgo(days * 24);

/** Издатели явно тестовые — чтобы демо-данные нельзя было принять за настоящие новости. */
export const PUBLISHERS = {
  analytics: 'Аналитика (тестовые данные)',
  official: 'Официальные сообщения (тестовые данные)',
  regional: 'Региональные новости (тестовые данные)',
  industry: 'Отраслевой обзор (тестовые данные)',
} as const;

type RawSource = [publisher: keyof typeof PUBLISHERS, title: string, publishedAt: string];

type RawInsight = Omit<Insight, 'companyId' | 'status' | 'sources' | 'revisions'> & {
  status?: Insight['status'];
  sources: RawSource[];
  revisions?: Insight['revisions'];
};

/** Собирает инсайт: ссылки на example.com, русская типографика во всех текстах. */
export function defineInsights(companyId: string, raw: RawInsight[]): Insight[] {
  return raw.map(({ sources, status = 'new', revisions = [], ...insight }) => ({
    ...insight,
    companyId,
    status,
    title: typograph(insight.title),
    whyItMatters: typograph(insight.whyItMatters),
    event: {
      ...insight.event,
      title: typograph(insight.event.title),
      ...(insight.event.place ? { place: typograph(insight.event.place) } : {}),
    },
    impactPath: insight.impactPath.map((step) => ({ ...step, label: typograph(step.label) })),
    consequence: typograph(insight.consequence),
    basis: insight.basis.map(typograph),
    unknowns: insight.unknowns.map(typograph),
    checks: insight.checks.map(typograph),
    sources: sources.map(([publisher, title, publishedAt], index): Source => ({
      id: `${insight.id}-s${String(index + 1)}`,
      title: typograph(title),
      publisher: PUBLISHERS[publisher],
      url: `https://example.com/news/${insight.id}-${String(index + 1)}`,
      publishedAt,
    })),
    revisions: revisions.map((revision) => ({ ...revision, note: typograph(revision.note) })),
  }));
}

type RawFact = [
  category: ProfileFact['category'],
  statement: string,
  status: ProfileFact['status'],
  source?: ProfileFact['source'],
];

const DESCRIPTION_SOURCE: ProfileFact['source'] = { kind: 'text', label: 'Описание компании' };

export function defineFacts(companyId: string, raw: RawFact[]): ProfileFact[] {
  return raw.map(([category, statement, status, source = DESCRIPTION_SOURCE], index) => ({
    id: `${companyId}-f${String(index + 1)}`,
    category,
    statement: typograph(statement),
    status,
    source,
  }));
}
