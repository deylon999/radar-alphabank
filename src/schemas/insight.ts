import { z } from 'zod';

import { isoDateTimeSchema } from './common';

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

export const insightKindSchema = z.enum(INSIGHT_KINDS);
export const urgencySchema = z.enum(URGENCIES);
export const eventStageSchema = z.enum(EVENT_STAGES);
export const relevanceSchema = z.enum(RELEVANCES);
export const insightStatusSchema = z.enum(INSIGHT_STATUSES);
export const impactRoleSchema = z.enum(IMPACT_ROLES);

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

export const updateInsightBodySchema = z.object({ status: insightStatusSchema });

export const feedbackBodySchema = z.object({
  useful: z.boolean(),
  comment: z.string().trim().min(1).max(2000).optional(),
});

export type InsightKind = z.infer<typeof insightKindSchema>;
export type Urgency = z.infer<typeof urgencySchema>;
export type EventStage = z.infer<typeof eventStageSchema>;
export type Relevance = z.infer<typeof relevanceSchema>;
export type InsightStatus = z.infer<typeof insightStatusSchema>;
export type ImpactRole = z.infer<typeof impactRoleSchema>;
export type ImpactStep = z.infer<typeof impactStepSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Insight = z.infer<typeof insightSchema>;
export type InsightList = z.infer<typeof insightListSchema>;
export type Digest = z.infer<typeof digestSchema>;
export type UpdateInsightBody = z.infer<typeof updateInsightBodySchema>;
export type FeedbackBody = z.infer<typeof feedbackBodySchema>;

/** Фильтры ленты: значения одного фильтра объединяются через «или», разные — через «и». */
export interface InsightFilters {
  kind?: InsightKind[];
  urgency?: Urgency[];
  stage?: EventStage[];
  relevance?: Relevance;
  q?: string;
}
