import type { ProfileFact } from '../../schemas/company';
import type {
  BankMaterial,
  BankView,
  Insight,
  Source,
  TraceStep,
  TraceStepKind,
} from '../../schemas/insight';
import { typograph } from '../../shared/lib/typography';
import { BANK_MATERIALS, type BankMaterialKey } from './bankMaterials';

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
  markets: 'Финансовые новости (тестовые данные)',
} as const;

type RawSource = [publisher: keyof typeof PUBLISHERS, title: string, publishedAt: string];

type RawBankView = [summary: string, material: BankMaterialKey, page?: number];

type RawInsight = Omit<
  Insight,
  'companyId' | 'status' | 'sources' | 'revisions' | 'bankView' | 'signals' | 'trace'
> & {
  status?: Insight['status'];
  sources: RawSource[];
  revisions?: Insight['revisions'];
  /** Позиция банка и, если банк её пересмотрел, прежняя оценка. */
  bank?: { view: RawBankView; supersedes?: RawBankView };
  signals?: [label: string, value: string][];
  trace?: [kind: TraceStepKind, title: string, detail?: string][];
};

function bankMaterial(key: BankMaterialKey, page?: number): BankMaterial {
  const { outdated, ...material }: Omit<BankMaterial, 'id' | 'page'> = BANK_MATERIALS[key];
  return {
    ...material,
    id: key,
    ...(page === undefined ? {} : { page }),
    ...(outdated ? { outdated } : {}),
  };
}

function defineBankView({ view, supersedes }: NonNullable<RawInsight['bank']>): BankView {
  const [summary, key, page] = view;
  return {
    summary: typograph(summary),
    material: bankMaterial(key, page),
    ...(supersedes
      ? {
          supersedes: {
            summary: typograph(supersedes[0]),
            material: bankMaterial(supersedes[1], supersedes[2]),
          },
        }
      : {}),
  };
}

const defineTrace = (raw: NonNullable<RawInsight['trace']>): TraceStep[] =>
  raw.map(([kind, title, detail]) => ({
    kind,
    title: typograph(title),
    ...(detail ? { detail: typograph(detail) } : {}),
  }));

/** Собирает инсайт: ссылки на example.com, русская типографика во всех текстах. */
export function defineInsights(companyId: string, raw: RawInsight[]): Insight[] {
  return raw.map(
    ({ sources, status = 'new', revisions = [], bank, signals, trace, ...insight }) => ({
      ...insight,
      ...(bank ? { bankView: defineBankView(bank) } : {}),
      ...(signals
        ? { signals: signals.map(([label, value]) => ({ label, value: typograph(value) })) }
        : {}),
      ...(trace ? { trace: defineTrace(trace) } : {}),
      ...(insight.offer
        ? {
            offer: {
              ...insight.offer,
              title: typograph(insight.offer.title),
              description: typograph(insight.offer.description),
            },
          }
        : {}),
      ...(insight.suggestedQuestions
        ? { suggestedQuestions: insight.suggestedQuestions.map(typograph) }
        : {}),
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
    }),
  );
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
