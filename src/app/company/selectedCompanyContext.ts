import { createContext, useContext } from 'react';

import type { Company } from '../../schemas/company';

export type CompanySelection =
  | { status: 'loading' }
  | { status: 'error'; error: unknown; retry: () => void; retrying: boolean }
  | { status: 'empty' }
  | {
      status: 'ready';
      company: Company;
      companies: Company[];
      selectCompany: (companyId: string) => void;
    };

export const SelectedCompanyContext = createContext<CompanySelection | null>(null);

export function useCompanySelection(): CompanySelection {
  const selection = useContext(SelectedCompanyContext);
  if (!selection) {
    throw new Error('useCompanySelection используется вне SelectedCompanyProvider');
  }
  return selection;
}

/** Выбранная компания. Доступна страницам внутри CompanyGate, где список уже загружен. */
export function useSelectedCompany(): Company {
  const selection = useCompanySelection();
  if (selection.status !== 'ready') {
    throw new Error(
      'useSelectedCompany используется до загрузки компаний — оберните в CompanyGate',
    );
  }
  return selection.company;
}
