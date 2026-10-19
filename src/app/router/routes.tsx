import type { ComponentType } from 'react';
import { matchPath, type RouteObject } from 'react-router';

import { NotFoundPage } from '../../pages/not-found/NotFoundPage';
import { PageSkeleton } from '../../shared/ui/Skeleton/PageSkeleton';
import { AppLayout, BusinessLayout } from '../layout/AppLayout';
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

const loadFeed = async () => (await import('../../pages/feed/FeedPage')).FeedPage;
const loadInsight = async () => (await import('../../pages/insight/InsightPage')).InsightPage;
const loadCompany = async () => (await import('../../pages/company/CompanyPage')).CompanyPage;
const loadNotifications = async () =>
  (await import('../../pages/notifications/NotificationsPage')).NotificationsPage;

const loadBusiness = async () =>
  (await import('../../pages/business/BusinessHomePage')).BusinessHomePage;

const PAGE_LOADERS: [pattern: string, load: () => Promise<ComponentType>][] = [
  ['/', loadFeed],
  ['/business', loadBusiness],
  ['/insights/:insightId', loadInsight],
  ['/company', loadCompany],
  ['/notifications', loadNotifications],
];

/**
 * Начинает загрузку чанка страницы по адресу, не дожидаясь роутера: при старте её код
 * качается параллельно с моками. Роутер потом получит уже загруженный модуль.
 */
export function preloadPage(pathname: string): void {
  const match = PAGE_LOADERS.find(([pattern]) => matchPath(pattern, pathname));
  if (match) {
    void match[1]().catch(() => undefined);
  }
}

export const routes: RouteObject[] = [
  {
    path: '/business',
    Component: BusinessLayout,
    HydrateFallback: PageSkeleton,
    ErrorBoundary: RouteErrorBoundary,
    children: [page(undefined, loadBusiness)],
  },
  {
    path: '/',
    Component: AppLayout,
    HydrateFallback: PageSkeleton,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      page(undefined, loadFeed),
      page('insights/:insightId', loadInsight),
      page('company', loadCompany),
      page('notifications', loadNotifications),
      // 404 и так в основном чанке: её показывает RouteErrorBoundary.
      { path: '*', Component: NotFoundPage, ErrorBoundary: RouteErrorBoundary },
    ],
  },
];
