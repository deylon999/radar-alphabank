import { z } from 'zod';

import { isoDateTimeSchema } from '../schemas/common';
import { companySchema } from '../schemas/company';
import { feedbackBodySchema, insightSchema } from '../schemas/insight';
import { notificationSettingsSchema } from '../schemas/notifications';
import { companies, demoFeedback, demoQuestions, insights, notificationSettings } from './fixtures';

const mockDbSchema = z.object({
  companies: z.array(companySchema),
  insights: z.array(insightSchema),
  notifications: notificationSettingsSchema,
  feedback: z.array(feedbackBodySchema.extend({ insightId: z.string(), at: isoDateTimeSchema })),
  questions: z.array(
    z.object({ insightId: z.string(), question: z.string(), at: isoDateTimeSchema }),
  ),
  /** Сколько «извлекаемых» фактов уже выдано каждой компании. */
  extractedCount: z.record(z.string(), z.number().int().nonnegative()),
  nextFactNumber: z.number().int().positive(),
});

export type MockDb = z.infer<typeof mockDbSchema>;

export type MockStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STORAGE_KEY = 'radar-mock-db-v2';

export function createInitialDb(): MockDb {
  return structuredClone({
    companies,
    insights,
    notifications: notificationSettings,
    feedback: demoFeedback,
    questions: demoQuestions,
    extractedCount: {},
    nextFactNumber: 1,
  });
}

function load(storage: MockStorage | undefined): MockDb | undefined {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = mockDbSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export interface MockStore {
  read(): MockDb;
  /** Меняет состояние и сохраняет его в хранилище, если оно доступно. */
  write(change: (db: MockDb) => void): void;
  reset(): void;
}

/**
 * Состояние моков. В браузере живёт в sessionStorage: переживает перезагрузку вкладки,
 * а новая вкладка или новый тест начинают с исходных фикстур.
 */
export function createMockStore(storage?: MockStorage): MockStore {
  let db = load(storage) ?? createInitialDb();

  const save = () => {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Хранилище недоступно (приватный режим, квота) — моки работают в памяти.
    }
  };

  return {
    read: () => db,
    write: (change) => {
      change(db);
      save();
    },
    reset: () => {
      db = createInitialDb();
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        // См. save().
      }
    },
  };
}
