import { z } from 'zod';

/** Дата и время в ISO 8601 со смещением или Z: «2026-10-18T09:20:00Z». */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** Нарушение правила валидации поля — как `ValidationIssue` в спецификации `api/`. */
export const validationIssueSchema = z.object({
  field: z.string(),
  title: z.string(),
  description: z.string(),
});

/**
 * Ошибка бэкенда в формате Problem Details (RFC 9457), как в спецификации `api/`.
 * `title` и `detail` — понятный русский текст: фронтенд показывает его пользователю.
 * `message` — прежний формат договора, пока бэкенд на него не перешёл.
 */
export const problemDetailsSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().int().optional(),
  detail: z.string().optional(),
  errors: z.array(validationIssueSchema).optional(),
  message: z.string().optional(),
});

export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

/** Текст ошибки для пользователя: пояснение, если есть, иначе название. */
export function problemMessage(problem: ProblemDetails): string | undefined {
  return problem.detail ?? problem.title ?? problem.message;
}
