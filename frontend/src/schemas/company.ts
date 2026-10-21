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
/** Продукты банка у клиента — флаги CL_PRODUCT_*_MARK и FACTORING_MARK датасета. */
export const BANK_PRODUCTS = [
  'settlement',
  'loan',
  'leasing',
  'guarantee',
  'deposit',
  'payroll',
  'factoring',
] as const;
/** Отношения с банком — CL_TYPE: CLIENT, PROSPECT, CLOSE_CLIENT. */
export const RELATIONSHIPS = ['client', 'prospect', 'closed'] as const;
export const PAYMENT_DIRECTIONS = ['incoming', 'outgoing'] as const;

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

export const bankProductSchema = z.enum(BANK_PRODUCTS);
export const relationshipSchema = z.enum(RELATIONSHIPS);
export const paymentDirectionSchema = z.enum(PAYMENT_DIRECTIONS);

/** Контрагент по платежам: incoming — платит клиенту, outgoing — получает от клиента. */
export const counterpartySchema = z.object({
  id: z.string().min(1),
  direction: paymentDirectionSchema,
  /** Сумма платежей, ₽. */
  amount: z.number().nonnegative(),
  payments: z.number().int().nonnegative(),
  industry: z.string().min(1).optional(),
});

/**
 * Признаки клиента из обезличенного датасета банка. Строковые градации — как в данных
 * («Более 251», «16-25»): интерфейс показывает их как есть.
 */
export const clientProfileSchema = z.object({
  okved: z.object({ code: z.string().min(1), name: z.string().min(1) }),
  region: z.string().min(1),
  city: z.string().min(1).optional(),
  /** Годовая выручка, ₽. */
  revenue: z.number().nonnegative(),
  employees: z.string().min(1).optional(),
  ageYears: z.string().min(1).optional(),
  stage: z.string().min(1).optional(),
  ownership: z.string().min(1).optional(),
  relationship: relationshipSchema,
  products: z.array(bankProductSchema),
  /** Страны внешнеторговой деятельности по данным ФТС; нет поля — нет ВЭД. */
  foreignTrade: z.object({ countries: z.array(z.string().min(1)).min(1) }).optional(),
  group: z.object({ id: z.string().min(1), companies: z.number().int().positive() }).optional(),
  counterparties: z.array(counterpartySchema),
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
  profile: clientProfileSchema.optional(),
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
export type BankProduct = z.infer<typeof bankProductSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type PaymentDirection = z.infer<typeof paymentDirectionSchema>;
export type Counterparty = z.infer<typeof counterpartySchema>;
export type ClientProfile = z.infer<typeof clientProfileSchema>;
export type Company = z.infer<typeof companySchema>;
export type DescribeCompanyBody = z.infer<typeof describeCompanyBodySchema>;
export type ExtractedFacts = z.infer<typeof extractedFactsSchema>;
export type UpdateFactBody = z.infer<typeof updateFactBodySchema>;
