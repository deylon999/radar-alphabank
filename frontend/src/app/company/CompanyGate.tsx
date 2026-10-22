import type { ReactNode } from 'react';

import { ConnectCompany } from '../../features/onboarding/ConnectCompany';
import { ErrorState } from '../../shared/ui/ErrorState';
import { PageSkeleton } from '../../shared/ui/Skeleton/PageSkeleton';
import { useCompanySelection } from './selectedCompanyContext';

/** Разделы показываются, когда известна компания; без неё — подключение компании. */
export function CompanyGate({ children }: { children: ReactNode }) {
  const selection = useCompanySelection();
  switch (selection.status) {
    case 'loading':
      return <PageSkeleton />;
    case 'error':
      return (
        <ErrorState
          title="Не удалось загрузить компанию"
          error={selection.error}
          retrying={selection.retrying}
          onRetry={selection.retry}
        />
      );
    case 'none':
      return <ConnectCompany me={selection.me} />;
    case 'ready':
      return children;
  }
}
