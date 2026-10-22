import { z } from 'zod';

import { isoDateTimeSchema } from '../schemas/common';
import { companySchema } from '../schemas/company';
import { feedbackBodySchema, insightSchema } from '../schemas/insight';
import { notificationSettingsSchema } from '../schemas/notifications';
import { userRoleSchema } from '../schemas/user';
import {
  companies,
  demoFeedback,
  demoQuestions,
  insights,
  notificationSettings,
  users,
} from './fixtures';

const mockUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  /** Моки хранят пароль открытым текстом: это демо, настоящий бэкенд хранит хеш. */
  password: z.string(),
  /** Код второго фактора; есть — значит, у пользователя включена 2FA. */
  totp: z.string().optional(),
  membership: z
    .object({
      companyId: z.string(),
      role: z.enum(['owner', 'member']),
      position: userRoleSchema.optional(),
    })
    .optional(),
  canViewQualityMetrics: z.boolean(),
});

const mockDbSchema = z.object({
  users: z.array(mockUserSchema),
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
export type MockUser = z.infer<typeof mockUserSchema>;

/** Сессия вкладки — как cookie на настоящем бэкенде. Хранится отдельно от данных. */
const mockSessionSchema = z.object({
  userId: z.string().optional(),
  /** Пароль проверен, ждём второй фактор. */
  pendingUserId: z.string().optional(),
  csrf: z.string().optional(),
});

export type MockSession = z.infer<typeof mockSessionSchema>;

export type MockStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STORAGE_KEY = 'radar-mock-db-v3';
export const SESSION_STORAGE_KEY = 'radar-mock-session-v1';

export function createInitialDb(): MockDb {
  return structuredClone({
    users,
    companies,
    insights,
    notifications: notificationSettings,
    feedback: demoFeedback,
    questions: demoQuestions,
    extractedCount: {},
    nextFactNumber: 1,
  });
}

function load<T>(
  storage: MockStorage | undefined,
  key: string,
  schema: z.ZodType<T>,
): T | undefined {
  try {
    const raw = storage?.getItem(key);
    if (!raw) {
      return undefined;
    }
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function save(storage: MockStorage | undefined, key: string, value: unknown): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Хранилище недоступно (приватный режим, квота) — моки работают в памяти.
  }
}

function remove(storage: MockStorage | undefined, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // См. save().
  }
}

export interface MockStore {
  read(): MockDb;
  /** Меняет состояние и сохраняет его в хранилище, если оно доступно. */
  write(change: (db: MockDb) => void): void;
  session(): MockSession;
  writeSession(change: (session: MockSession) => void): void;
  /** Исходные данные и исходная сессия. */
  reset(): void;
}

interface MockStoreOptions {
  /** Сессия при старте и после reset: в тестах — сразу вошедший пользователь. */
  initialSession?: MockSession;
}

/**
 * Состояние моков. В браузере живёт в sessionStorage: переживает перезагрузку вкладки,
 * а новая вкладка или новый тест начинают с исходных фикстур.
 */
export function createMockStore(storage?: MockStorage, options: MockStoreOptions = {}): MockStore {
  const initialSession = () => structuredClone(options.initialSession ?? {});
  let db = load(storage, STORAGE_KEY, mockDbSchema) ?? createInitialDb();
  let session = load(storage, SESSION_STORAGE_KEY, mockSessionSchema) ?? initialSession();

  return {
    read: () => db,
    write: (change) => {
      change(db);
      save(storage, STORAGE_KEY, db);
    },
    session: () => session,
    writeSession: (change) => {
      change(session);
      save(storage, SESSION_STORAGE_KEY, session);
    },
    reset: () => {
      db = createInitialDb();
      session = initialSession();
      remove(storage, STORAGE_KEY);
      remove(storage, SESSION_STORAGE_KEY);
    },
  };
}
