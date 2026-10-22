import { type ReactNode, useMemo } from 'react';

import { useMe } from '../../api/hooks/auth';
import { useCompany } from '../../api/hooks/companies';
import { type CompanySelection, SelectedCompanyContext } from './selectedCompanyContext';

/**
 * Компания — та, в которой состоит пользователь (`/me`). Чужие компании недоступны: выбирать
 * нечего. Без членства — экран подключения компании.
 */
export function SelectedCompanyProvider({ children }: { children: ReactNode }) {
  const me = useMe();
  const membership = me.data?.membership ?? null;
  const company = useCompany(membership?.company.id ?? '', { enabled: Boolean(membership) });

  const { data, error, isFetching, refetch } = company;
  const selection = useMemo((): CompanySelection => {
    if (!me.data) return { status: 'loading' };
    if (!membership) return { status: 'none', me: me.data };
    if (data) return { status: 'ready', company: data, membership };
    if (error) {
      return {
        status: 'error',
        error,
        retrying: isFetching,
        retry: () => {
          void refetch();
        },
      };
    }
    return { status: 'loading' };
  }, [me.data, membership, data, error, isFetching, refetch]);

  return <SelectedCompanyContext value={selection}>{children}</SelectedCompanyContext>;
}
