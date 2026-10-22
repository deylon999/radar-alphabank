import type { InsightFilters } from '../schemas/insight';

/**
 * Фабрика ключей TanStack Query. Ключи иерархические, чтобы инвалидировать целыми ветками:
 * `queryKeys.insights.all` сбрасывает и ленты, и карточки.
 */
export const queryKeys = {
  me: ['me'] as const,
  companies: {
    all: ['companies'] as const,
    list: (query = '') => [...queryKeys.companies.all, 'list', query.trim()] as const,
    detail: (companyId: string) => [...queryKeys.companies.all, 'detail', companyId] as const,
  },
  insights: {
    all: ['insights'] as const,
    lists: (companyId: string) => [...queryKeys.insights.all, 'list', companyId] as const,
    list: (companyId: string, filters: InsightFilters) =>
      [...queryKeys.insights.lists(companyId), filters] as const,
    digest: (companyId: string) => [...queryKeys.insights.all, 'digest', companyId] as const,
    overview: (companyId: string) => [...queryKeys.insights.all, 'overview', companyId] as const,
    detail: (insightId: string) => [...queryKeys.insights.all, 'detail', insightId] as const,
  },
  quality: () => ['quality'] as const,
  notifications: {
    settings: () => ['notifications', 'settings'] as const,
  },
};
