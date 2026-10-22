import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useMe } from '../../api/hooks/auth';
import { onUnauthorized } from '../../api/http';
import { queryKeys } from '../../api/queryKeys';
import { ErrorState } from '../../shared/ui/ErrorState';
import { PageSkeleton } from '../../shared/ui/Skeleton/PageSkeleton';
import { loginPath } from './nextPath';

/** Разделы Радара — только после входа; без входа ведём на вход и потом обратно. */
export function AuthGate({ children }: { children: ReactNode }) {
  const me = useMe();
  const { pathname, search } = useLocation();
  const queryClient = useQueryClient();

  // Сессия истекла посреди работы: любой ответ 401 — на вход, и после него обратно сюда.
  useEffect(
    () =>
      onUnauthorized(() => {
        queryClient.setQueryData(queryKeys.me, null);
      }),
    [queryClient],
  );

  if (me.data === undefined) {
    return me.isError ? (
      <ErrorState
        title="Не удалось проверить вход"
        error={me.error}
        retrying={me.isFetching}
        onRetry={() => {
          void me.refetch();
        }}
      />
    ) : (
      <PageSkeleton />
    );
  }
  if (me.data === null) {
    return <Navigate to={loginPath(pathname, search)} replace />;
  }
  return children;
}
