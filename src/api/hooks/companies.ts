import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Company, DescribeCompanyBody, UpdateFactBody } from '../../schemas/company';
import {
  describeCompany,
  fetchCompanies,
  fetchCompany,
  updateFact,
  uploadCompanyDocuments,
} from '../endpoints/companies';
import { queryKeys } from '../queryKeys';

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.list(),
    queryFn: ({ signal }) => fetchCompanies(signal),
  });
}

export function useCompany(companyId: string) {
  return useQuery({
    queryKey: queryKeys.companies.detail(companyId),
    queryFn: ({ signal }) => fetchCompany(companyId, signal),
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

export function useUpdateFact(companyId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateCompany(companyId);
  return useMutation({
    mutationFn: ({ factId, body }: { factId: string; body: UpdateFactBody }) =>
      updateFact(companyId, factId, body),
    onSuccess: (fact) => {
      queryClient.setQueryData<Company>(queryKeys.companies.detail(companyId), (company) =>
        company
          ? { ...company, facts: company.facts.map((item) => (item.id === fact.id ? fact : item)) }
          : company,
      );
      return invalidate();
    },
  });
}
