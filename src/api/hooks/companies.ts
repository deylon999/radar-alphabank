import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  Company,
  DescribeCompanyBody,
  ProfileFact,
  UpdateFactBody,
} from '../../schemas/company';
import {
  describeCompany,
  fetchCompanies,
  fetchCompany,
  updateFact,
  uploadCompanyDocuments,
} from '../endpoints/companies';
import { queryKeys } from '../queryKeys';

/** Список клиентов. Пока идёт новый поиск, показываются прежние результаты. */
export function useCompanies(query = '') {
  return useQuery({
    queryKey: queryKeys.companies.list(query),
    queryFn: ({ signal }) => fetchCompanies(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCompany(companyId: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.companies.detail(companyId),
    queryFn: ({ signal }) => fetchCompany(companyId, signal),
    enabled,
  });
}

/** После разбора материалов меняются и профиль, и лента компании. */
function useInvalidateCompany(companyId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(companyId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.insights.lists(companyId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.insights.digest(companyId) }),
    ]);
}

export function useDescribeCompany(companyId: string) {
  const invalidate = useInvalidateCompany(companyId);
  return useMutation({
    mutationFn: (body: DescribeCompanyBody) => describeCompany(companyId, body),
    onSuccess: invalidate,
  });
}

export function useUploadCompanyDocuments(companyId: string) {
  const invalidate = useInvalidateCompany(companyId);
  return useMutation({
    mutationFn: (files: readonly File[]) => uploadCompanyDocuments(companyId, files),
    onSuccess: invalidate,
  });
}

/** Кладёт обновлённые факты в кеш профиля сразу, не дожидаясь перезапроса. */
function useStoreFacts(companyId: string) {
  const queryClient = useQueryClient();
  return (facts: readonly ProfileFact[]) => {
    const byId = new Map(facts.map((fact) => [fact.id, fact]));
    queryClient.setQueryData<Company>(queryKeys.companies.detail(companyId), (company) =>
      company
        ? { ...company, facts: company.facts.map((item) => byId.get(item.id) ?? item) }
        : company,
    );
  };
}

export function useUpdateFact(companyId: string) {
  const storeFacts = useStoreFacts(companyId);
  const invalidate = useInvalidateCompany(companyId);
  return useMutation({
    mutationFn: ({ factId, body }: { factId: string; body: UpdateFactBody }) =>
      updateFact(companyId, factId, body),
    onSuccess: (fact) => {
      storeFacts([fact]);
      return invalidate();
    },
  });
}

/**
 * «Подтвердить все»: отдельного эндпоинта в контракте нет, поэтому PATCH на каждый факт.
 * Принятые сервером факты попадают в кеш, даже если часть запросов не прошла.
 */
export function useConfirmFacts(companyId: string) {
  const storeFacts = useStoreFacts(companyId);
  const invalidate = useInvalidateCompany(companyId);
  return useMutation({
    mutationFn: async (factIds: readonly string[]) => {
      const results = await Promise.allSettled(
        factIds.map((factId) => updateFact(companyId, factId, { status: 'confirmed' })),
      );
      const confirmed = results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      storeFacts(confirmed);
      const failure = results.find((result) => result.status === 'rejected');
      if (failure) {
        throw failure.reason;
      }
      return confirmed;
    },
    onSettled: invalidate,
  });
}
