import type { InsightFilters } from '../schemas/insight';

/**
 * Фабрика ключей TanStack Query. Ключи иерархические, чтобы инвалидировать целыми ветками:
 * `queryKeys.insights.all` сбрасывает и ленты, и карточки.
 */
export const queryKeys = {
  companies: {
    all: ['companies'] as const,
    list: () => [...queryKeys.companies.all, 'list'] as const,
    detail: (companyId: string) => [...queryKeys.companies.all, 'detail', companyId] as const,
  },
  insights: {
    all: ['insights'] as const,
    lists: (companyId: string) => [...queryKeys.insights.all, 'list', companyId] as const,
    list: (companyId: string, filters: InsightFilters) =>
      [...queryKeys.insights.lists(companyId), filters] as const,
    digest: (companyId: string) => [...queryKeys.insights.all, 'digest', companyId] as const,
    detail: (insightId: string) => [...queryKeys.insights.all, 'detail', insightId] as const,
  },
  notifications: {
    settings: () => ['notifications', 'settings'] as const,
  },
};
