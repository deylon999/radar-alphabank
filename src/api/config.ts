import { z } from 'zod';

/** Значения по умолчанию совпадают с .env.example, чтобы демо работало без локального .env. */
const envSchema = z.object({
  VITE_API_URL: z.url().default('http://localhost:8000'),
  VITE_USE_MOCKS: z.enum(['true', 'false']).default('true'),
});

export interface ApiConfig {
  /** Адрес бэкенда без завершающего слэша. */
  apiUrl: string;
  useMocks: boolean;
}

export function parseApiConfig(env: Record<string, unknown>): ApiConfig {
  const parsed = envSchema.parse(env);
  return {
    apiUrl: parsed.VITE_API_URL.replace(/\/+$/, ''),
    useMocks: parsed.VITE_USE_MOCKS === 'true',
  };
}

export const apiConfig: ApiConfig = parseApiConfig(import.meta.env);
