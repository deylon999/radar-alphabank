import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { useCompanies, useCompany } from '../../api/hooks/companies';
import { queryKeys } from '../../api/queryKeys';
import type { Company } from '../../schemas/company';
import { safeStorage } from '../../shared/lib/safeStorage';
import { type CompanySelection, SelectedCompanyContext } from './selectedCompanyContext';

export const SELECTED_COMPANY_STORAGE_KEY = 'radar.selectedCompanyId';

/**
 * Выбранный клиент переживает перезагрузку. Список по умолчанию — крупнейшие клиенты; если
 * сохранённого в нём нет (его нашли поиском), он загружается отдельно. Неизвестный ID —
 * первый клиент списка.
 */
export function SelectedCompanyProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const list = useCompanies();
  const [storedId, setStoredId] = useState(() => safeStorage.get(SELECTED_COMPANY_STORAGE_KEY));
  const fromList = list.data?.find((company) => company.id === storedId);
  const needsDetail = Boolean(list.data && storedId && !fromList);
  const detail = useCompany(storedId ?? '', { enabled: needsDetail });

  const selectCompany = useCallback(
    (company: Company) => {
      // Клиент из поиска уже загружен — кладём его в кеш, чтобы шапка сменилась сразу.
      queryClient.setQueryData(queryKeys.companies.detail(company.id), company);
      setStoredId(company.id);
      safeStorage.set(SELECTED_COMPANY_STORAGE_KEY, company.id);
    },
    [queryClient],
  );

  const { data: companies, error, isFetching, refetch } = list;
  const selection = useMemo((): CompanySelection => {
    if (!companies) {
      return error
        ? {
            status: 'error',
            error,
            retrying: isFetching,
            retry: () => {
              void refetch();
            },
          }
        : { status: 'loading' };
    }
    if (needsDetail && detail.isPending) {
      return { status: 'loading' };
    }
    const company = fromList ?? (needsDetail ? detail.data : undefined) ?? companies[0];
    return company ? { status: 'ready', company, selectCompany } : { status: 'empty' };
  }, [
    companies,
    error,
    isFetching,
    refetch,
    needsDetail,
    detail.isPending,
    detail.data,
    fromList,
    selectCompany,
  ]);

  return <SelectedCompanyContext value={selection}>{children}</SelectedCompanyContext>;
}
