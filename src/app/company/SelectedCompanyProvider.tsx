import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { useCompanies } from '../../api/hooks/companies';
import type { Company } from '../../schemas/company';
import { safeStorage } from '../../shared/lib/safeStorage';
import { type CompanySelection, SelectedCompanyContext } from './selectedCompanyContext';

export const SELECTED_COMPANY_STORAGE_KEY = 'radar.selectedCompanyId';

/** Сохранённая компания, а если её нет в списке — первая: выбор переживает перезагрузку. */
export function resolveCompany(companies: Company[], storedId: string | null): Company | undefined {
  return companies.find((company) => company.id === storedId) ?? companies[0];
}

export function SelectedCompanyProvider({ children }: { children: ReactNode }) {
  const companiesQuery = useCompanies();
  const [storedId, setStoredId] = useState(() => safeStorage.get(SELECTED_COMPANY_STORAGE_KEY));

  const selectCompany = useCallback((companyId: string) => {
    setStoredId(companyId);
    safeStorage.set(SELECTED_COMPANY_STORAGE_KEY, companyId);
  }, []);

  const { data: companies, error, isFetching, refetch } = companiesQuery;
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
    const company = resolveCompany(companies, storedId);
    return company ? { status: 'ready', company, companies, selectCompany } : { status: 'empty' };
  }, [companies, error, isFetching, refetch, storedId, selectCompany]);

  return <SelectedCompanyContext value={selection}>{children}</SelectedCompanyContext>;
}
