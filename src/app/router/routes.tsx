import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';

import { NotFoundPage } from '../../pages/not-found/NotFoundPage';
import { PageSkeleton } from '../../shared/ui/Skeleton/PageSkeleton';
import { AppLayout } from '../layout/AppLayout';
import { RouteErrorBoundary } from './RouteErrorBoundary';

/**
 * Страница: отдельный чанк и собственный ErrorBoundary — ошибка не роняет каркас.
 * Без `path` — индексный маршрут.
 */
function page(path: string | undefined, load: () => Promise<ComponentType>): RouteObject {
  const common = {
    ErrorBoundary: RouteErrorBoundary,
    lazy: async () => ({ Component: await load() }),
  };
  return path === undefined ? { index: true, ...common } : { path, ...common };
}

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: AppLayout,
    HydrateFallback: PageSkeleton,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      page(undefined, async () => (await import('../../pages/feed/FeedPage')).FeedPage),
      page(
        'insights/:insightId',
        async () => (await import('../../pages/insight/InsightPage')).InsightPage,
      ),
      page('company', async () => (await import('../../pages/company/CompanyPage')).CompanyPage),
      page(
        'notifications',
        async () => (await import('../../pages/notifications/NotificationsPage')).NotificationsPage,
      ),
      // 404 и так в основном чанке: её показывает RouteErrorBoundary.
      { path: '*', Component: NotFoundPage, ErrorBoundary: RouteErrorBoundary },
    ],
  },
];
