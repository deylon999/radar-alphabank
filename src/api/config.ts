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

/**
 * С моками запросы идут на адрес самого сайта: их перехватывает Service Worker, и до сети
 * они не доходят. Ходить на VITE_API_URL нельзя — с https-сайта запрос на http://localhost
 * мобильные браузеры блокируют раньше, чем его увидит Service Worker.
 */
export function parseApiConfig(env: Record<string, unknown>, siteOrigin?: string): ApiConfig {
  const parsed = envSchema.parse(env);
  const useMocks = parsed.VITE_USE_MOCKS === 'true';
  return {
    apiUrl: (useMocks && siteOrigin ? siteOrigin : parsed.VITE_API_URL).replace(/\/+$/, ''),
    useMocks,
  };
}

/**
 * Состояние моков в браузере: если Service Worker не запустился, экраны объясняют почему.
 * `restart` появляется, когда моки работают, — им http-клиент подключает их заново.
 */
export const mockStatus: { failed: boolean; restart?: () => Promise<void> } = { failed: false };

export const apiConfig: ApiConfig = parseApiConfig(
  import.meta.env,
  typeof window === 'undefined' ? undefined : window.location.origin,
);
