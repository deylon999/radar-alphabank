import { z } from 'zod';

import { isoDateTimeSchema } from './common';
import { topicSchema } from './insight';

const count = z.number().int().nonnegative();

const insightRefSchema = z.object({
  insightId: z.string().min(1),
  insightTitle: z.string().min(1),
  at: isoDateTimeSchema,
});

/** Метрики качества выводов по всем клиентам — экран для команды и жюри. */
export const qualityMetricsSchema = z.object({
  generatedAt: isoDateTimeSchema,
  /** Сколько выводов выдано. Остальные счётчики — из этого числа. */
  insights: count,
  engagement: z.object({
    /** Открыли карточку и не скрыли. */
    read: count,
    dismissed: count,
    questions: count,
  }),
  /** Последняя оценка каждого вывода: повторная от того же человека заменяет прежнюю. */
  feedback: z.object({
    useful: count,
    notUseful: count,
    comments: z
      .array(insightRefSchema.extend({ useful: z.boolean(), comment: z.string().min(1) }))
      .max(10),
  }),
  completeness: z.object({
    /** С позицией банка на свежем материале. */
    withBankView: count,
    withSignals: count,
    /** В шагах агента есть самопроверка (`trace[].kind = check`). */
    withSelfCheck: count,
    withChecks: count,
    /** Позиция банка на устаревшем материале — интерфейс предупреждает. */
    outdatedBankView: count,
  }),
  /** Минуты от последнего сигнала до вывода: новости или материала банка, вышедших раньше него. */
  reactionMinutes: z.object({ median: count, p90: count }),
  topics: z.array(
    z.object({
      topic: topicSchema,
      insights: count,
      useful: count,
      notUseful: count,
      dismissed: count,
    }),
  ),
  questions: z.array(insightRefSchema.extend({ question: z.string().min(1) })).max(10),
});

export type QualityMetrics = z.infer<typeof qualityMetricsSchema>;
