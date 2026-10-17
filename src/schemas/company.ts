import { z } from 'zod';

export const FACT_CATEGORIES = [
  'supplier',
  'customer',
  'site',
  'region',
  'product',
  'logistics',
  'finance',
  'other',
] as const;
export const FACT_STATUSES = ['confirmed', 'pending', 'rejected'] as const;
export const FACT_SOURCE_KINDS = ['text', 'document', 'link'] as const;

export const factCategorySchema = z.enum(FACT_CATEGORIES);
export const factStatusSchema = z.enum(FACT_STATUSES);
export const factSourceKindSchema = z.enum(FACT_SOURCE_KINDS);

export const profileFactSchema = z.object({
  id: z.string().min(1),
  category: factCategorySchema,
  statement: z.string().min(1),
  status: factStatusSchema,
  source: z.object({
    kind: factSourceKindSchema,
    label: z.string().min(1),
  }),
});

export const companySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  inn: z
    .string()
    .regex(/^(\d{10}|\d{12})$/)
    .optional(),
  industry: z.string().min(1),
  description: z.string(),
  facts: z.array(profileFactSchema),
});

export const companyListSchema = z.array(companySchema);

export const describeCompanyBodySchema = z.object({
  text: z.string().trim(),
  links: z.array(z.url()),
});

export const extractedFactsSchema = z.object({ facts: z.array(profileFactSchema) });

export const updateFactBodySchema = z
  .object({
    status: factStatusSchema.optional(),
    statement: z.string().trim().min(1).optional(),
  })
  .refine((body) => body.status !== undefined || body.statement !== undefined, {
    message: 'Нужно передать status или statement',
  });

/** Ограничения загрузки документов — общие для формы и моков. */
export const DOCUMENT_RULES = {
  maxSizeBytes: 10 * 1024 * 1024,
  extensions: ['pdf', 'docx', 'txt'],
} as const;

export type FactCategory = z.infer<typeof factCategorySchema>;
export type FactStatus = z.infer<typeof factStatusSchema>;
export type FactSourceKind = z.infer<typeof factSourceKindSchema>;
export type ProfileFact = z.infer<typeof profileFactSchema>;
export type Company = z.infer<typeof companySchema>;
export type DescribeCompanyBody = z.infer<typeof describeCompanyBodySchema>;
export type ExtractedFacts = z.infer<typeof extractedFactsSchema>;
export type UpdateFactBody = z.infer<typeof updateFactBodySchema>;
