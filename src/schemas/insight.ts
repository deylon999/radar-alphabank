import { z } from 'zod';

import { isoDateTimeSchema } from './common';
import { userRoleSchema } from './user';

export const INSIGHT_KINDS = ['risk', 'opportunity'] as const;
export const URGENCIES = ['urgent', 'important', 'info'] as const;
export const EVENT_STAGES = ['occurred', 'discussed', 'decided', 'resolved'] as const;
export const RELEVANCES = ['direct', 'possible'] as const;
export const INSIGHT_STATUSES = ['new', 'read', 'dismissed'] as const;
export const IMPACT_ROLES = [
  'event',
  'place',
  'asset',
  'supply',
  'counterparty',
  'market',
  'company',
] as const;

/** Тема вывода — разрез обзора: «Ставка и кредиты», «Курс рубля»… */
export const TOPICS = [
  'financing',
  'currency',
  'costs',
  'demand',
  'regulation',
  'logistics',
] as const;

export const TRACE_STEP_KINDS = ['plan', 'tool', 'check', 'conclusion'] as const;
export const CITATION_KINDS = ['news', 'bank', 'client'] as const;

export const insightKindSchema = z.enum(INSIGHT_KINDS);
export const urgencySchema = z.enum(URGENCIES);
export const eventStageSchema = z.enum(EVENT_STAGES);
export const relevanceSchema = z.enum(RELEVANCES);
export const insightStatusSchema = z.enum(INSIGHT_STATUSES);
export const impactRoleSchema = z.enum(IMPACT_ROLES);
export const topicSchema = z.enum(TOPICS);

export const impactStepSchema = z.object({
  label: z.string().min(1),
  role: impactRoleSchema,
});

export const sourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.url(),
  publishedAt: isoDateTimeSchema,
});

export const insightEventSchema = z.object({
  title: z.string().min(1),
  stage: eventStageSchema,
  occurredAt: isoDateTimeSchema.optional(),
  place: z.string().min(1).optional(),
});

/** Аналитический материал банка: на него ссылается позиция банка. */
export const bankMaterialSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  publishedAt: isoDateTimeSchema,
  page: z.number().int().positive().optional(),
  /** Материал устарел для текущей ситуации — интерфейс предупреждает об этом. */
  outdated: z.boolean().optional(),
});

/** Позиция Альфа-Банка: выжимка из его аналитики, а не вывод модели. */
export const bankViewSchema = z.object({
  summary: z.string().min(1),
  material: bankMaterialSchema,
  /** Прежняя оценка, которую банк пересмотрел более свежим материалом. */
  supersedes: z.object({ summary: z.string().min(1), material: bankMaterialSchema }).optional(),
});

/** Признак клиента, повлиявший на вывод: «Кредиты в Альфа-Банке — есть». */
export const clientSignalSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

/** Шаг агента: из них собирается «Как получен вывод». */
export const traceStepSchema = z.object({
  kind: z.enum(TRACE_STEP_KINDS),
  title: z.string().min(1),
  detail: z.string().min(1).optional(),
});

/** Продукт банка, уместный в контексте инсайта, — подписывается как предложение банка. */
export const bankOfferSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  url: z.url(),
});

export const revisionSchema = z.object({
  at: isoDateTimeSchema,
  note: z.string().min(1),
});

export const insightSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  kind: insightKindSchema,
  urgency: urgencySchema,
  relevance: relevanceSchema,
  status: insightStatusSchema,
  topic: topicSchema,
  title: z.string().min(1),
  whyItMatters: z.string().min(1),
  event: insightEventSchema,
  impactPath: z.array(impactStepSchema).min(2).max(6),
  /** Возможное последствие — всегда гипотеза, в интерфейсе подписывается «Гипотеза». */
  consequence: z.string().min(1),
  basis: z.array(z.string().min(1)),
  unknowns: z.array(z.string().min(1)),
  checks: z.array(z.string().min(1)),
  sources: z.array(sourceSchema).min(1),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  revisions: z.array(revisionSchema),
  bankView: bankViewSchema.optional(),
  signals: z.array(clientSignalSchema).optional(),
  trace: z.array(traceStepSchema).optional(),
  offer: bankOfferSchema.optional(),
  suggestedQuestions: z.array(z.string().min(1)).max(4).optional(),
});

export const insightListSchema = z.object({
  items: z.array(insightSchema),
  nextCursor: z.string().min(1).nullable(),
});

export const digestSchema = z.object({
  since: isoDateTimeSchema,
  /** Срочные риски — входят и в `risks`. */
  urgentRisks: z.number().int().nonnegative(),
  /** Все риски с `since`, включая срочные: совпадает с фильтром «Тип: риск». */
  risks: z.number().int().nonnegative(),
  opportunities: z.number().int().nonnegative(),
});

/** Инсайт в обзоре: только то, что нужно для строки со ссылкой. */
export const insightBriefSchema = insightSchema.pick({
  id: true,
  kind: true,
  urgency: true,
  relevance: true,
  status: true,
  title: true,
  updatedAt: true,
});

const overviewGroup = { insights: z.array(insightBriefSchema).min(1) };

/** Все актуальные выводы по компании в двух разрезах: по темам и по материалам банка. */
export const overviewSchema = z.object({
  topics: z.array(z.object({ topic: topicSchema, ...overviewGroup })),
  materials: z.array(
    z.object({ material: bankMaterialSchema.omit({ page: true }), ...overviewGroup }),
  ),
});

export const updateInsightBodySchema = z.object({ status: insightStatusSchema });

export const feedbackBodySchema = z.object({
  useful: z.boolean(),
  comment: z.string().trim().min(1).max(2000).optional(),
});

export const askBodySchema = z.object({
  question: z.string().trim().min(1).max(500),
  role: userRoleSchema.optional(),
});

/** Ссылка ответа на источник: новость, материал банка или данные клиента. */
export const citationSchema = z.object({
  kind: z.enum(CITATION_KINDS),
  label: z.string().min(1),
  url: z.url().optional(),
});

export const answerSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  citations: z.array(citationSchema),
});

export type InsightKind = z.infer<typeof insightKindSchema>;
export type Urgency = z.infer<typeof urgencySchema>;
export type EventStage = z.infer<typeof eventStageSchema>;
export type Relevance = z.infer<typeof relevanceSchema>;
export type InsightStatus = z.infer<typeof insightStatusSchema>;
export type ImpactRole = z.infer<typeof impactRoleSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type ImpactStep = z.infer<typeof impactStepSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Insight = z.infer<typeof insightSchema>;
export type InsightList = z.infer<typeof insightListSchema>;
export type Digest = z.infer<typeof digestSchema>;
export type InsightBrief = z.infer<typeof insightBriefSchema>;
export type Overview = z.infer<typeof overviewSchema>;
export type UpdateInsightBody = z.infer<typeof updateInsightBodySchema>;
export type FeedbackBody = z.infer<typeof feedbackBodySchema>;
export type BankMaterial = z.infer<typeof bankMaterialSchema>;
export type BankView = z.infer<typeof bankViewSchema>;
export type ClientSignal = z.infer<typeof clientSignalSchema>;
export type TraceStep = z.infer<typeof traceStepSchema>;
export type TraceStepKind = TraceStep['kind'];
export type BankOffer = z.infer<typeof bankOfferSchema>;
export type AskBody = z.infer<typeof askBodySchema>;
export type Citation = z.infer<typeof citationSchema>;
export type CitationKind = Citation['kind'];
export type Answer = z.infer<typeof answerSchema>;

/** Фильтры ленты: значения одного фильтра объединяются через «или», разные — через «и». */
export interface InsightFilters {
  kind?: InsightKind[];
  urgency?: Urgency[];
  stage?: EventStage[];
  relevance?: Relevance;
  q?: string;
}
