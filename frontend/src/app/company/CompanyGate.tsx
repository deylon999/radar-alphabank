import type { ReactNode } from 'react';

import { EmptyState } from '../../shared/ui/EmptyState';
import { ErrorState } from '../../shared/ui/ErrorState';
import { PageSkeleton } from '../../shared/ui/Skeleton/PageSkeleton';
import { useCompanySelection } from './selectedCompanyContext';

/** Страницы показываются, только когда известна выбранная компания. */
export function CompanyGate({ children }: { children: ReactNode }) {
  const selection = useCompanySelection();
  switch (selection.status) {
    case 'loading':
      return <PageSkeleton />;
    case 'error':
      return (
        <ErrorState
          title="Не удалось загрузить список компаний"
          error={selection.error}
          retrying={selection.retrying}
          onRetry={selection.retry}
        />
      );
    case 'empty':
      return (
        <EmptyState
          title="Компаний пока нет"
          description={
            'Добавьте компанию на стороне сервиса\u00a0— после этого здесь появится лента.'
          }
        />
      );
    case 'ready':
      return children;
  }
}
