import type { ReactNode } from 'react';

import { ErrorState } from './ErrorState';

/** Минимум полей результата useQuery, нужный для четырёх состояний экрана. */
interface QueryLike<T> {
  data: T | undefined;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  refetch: () => unknown;
}

interface QueryViewProps<T> {
  query: QueryLike<T>;
  skeleton: ReactNode;
  errorTitle: string;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}

/**
 * Четыре состояния экрана с данными: загрузка, ошибка с «Повторить», пусто, данные.
 * Если повторный запрос упал, а данные уже есть, показываем данные.
 */
export function QueryView<T>({
  query,
  skeleton,
  errorTitle,
  isEmpty,
  empty,
  children,
}: QueryViewProps<T>) {
  const { data } = query;
  if (data === undefined) {
    if (query.isError) {
      return (
        <ErrorState
          title={errorTitle}
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => {
            void query.refetch();
          }}
        />
      );
    }
    return skeleton;
  }
  if (isEmpty?.(data) && empty) {
    return empty;
  }
  return children(data);
}
