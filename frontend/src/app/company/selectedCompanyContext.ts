import { createContext, useContext } from 'react';

import type { Me, Membership } from '../../schemas/auth';
import type { Company } from '../../schemas/company';

export type CompanySelection =
  | { status: 'loading' }
  | { status: 'error'; error: unknown; retry: () => void; retrying: boolean }
  /** Пользователь ещё не в компании: подаёт заявку или создаёт свою. */
  | { status: 'none'; me: Me }
  | { status: 'ready'; company: Company; membership: Membership };

export const SelectedCompanyContext = createContext<CompanySelection | null>(null);

export function useCompanySelection(): CompanySelection {
  const selection = useContext(SelectedCompanyContext);
  if (!selection) {
    throw new Error('useCompanySelection используется вне SelectedCompanyProvider');
  }
  return selection;
}

function useReady() {
  const selection = useCompanySelection();
  if (selection.status !== 'ready') {
    throw new Error('Компания ещё не загружена — оберните в CompanyGate');
  }
  return selection;
}

/** Компания пользователя. Доступна страницам внутри CompanyGate. */
export function useSelectedCompany(): Company {
  return useReady().company;
}

/** Членство пользователя: владелец или участник, должность. */
export function useMembership(): Membership {
  return useReady().membership;
}
