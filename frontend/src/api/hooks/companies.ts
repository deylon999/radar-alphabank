import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateCompanyBody, JoinDecision, JoinRequestBody } from '../../schemas/auth';
import type {
  Company,
  DescribeCompanyBody,
  ProfileFact,
  UpdateFactBody,
} from '../../schemas/company';
import {
  cancelJoinRequest,
  createCompany,
  decideJoinRequest,
  describeCompany,
  fetchCompany,
  fetchJoinRequests,
  fetchMembers,
  removeMember,
  searchCompanies,
  submitJoinRequest,
  updateFact,
  uploadCompanyDocuments,
} from '../endpoints/companies';
import { queryKeys } from '../queryKeys';

export const COMPANY_SEARCH_MIN = 2;

/** Поиск компании для заявки. Пока идёт новый поиск, показываются прежние результаты. */
export function useCompanySearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.companies.search(trimmed),
    queryFn: ({ signal }) => searchCompanies(trimmed, signal),
    enabled: trimmed.length >= COMPANY_SEARCH_MIN,
    placeholderData: keepPreviousData,
  });
}

/** Членство и заявка — в `/me`: после этих действий меняется, что видит пользователь. */
function useInvalidateMe() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.me });
}

export function useCreateCompany() {
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: (body: CreateCompanyBody) => createCompany(body),
    onSuccess: invalidateMe,
  });
}

export function useSubmitJoinRequest() {
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: ({ companyId, body }: { companyId: string; body: JoinRequestBody }) =>
      submitJoinRequest(companyId, body),
    onSuccess: invalidateMe,
  });
}

export function useCancelJoinRequest() {
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: ({ companyId, requestId }: { companyId: string; requestId: string }) =>
      cancelJoinRequest(companyId, requestId),
    onSuccess: invalidateMe,
  });
}

/** Заявки видит только владелец: остальным запрос не нужен. */
export function useJoinRequests(companyId: string, { enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: queryKeys.companies.joinRequests(companyId),
    queryFn: ({ signal }) => fetchJoinRequests(companyId, signal),
    enabled,
  });
}

export function useMembers(companyId: string) {
  return useQuery({
    queryKey: queryKeys.companies.members(companyId),
    queryFn: ({ signal }) => fetchMembers(companyId, signal),
  });
}

function useInvalidateTeam(companyId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.joinRequests(companyId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.members(companyId) }),
    ]);
}

export function useDecideJoinRequest(companyId: string) {
  const invalidateTeam = useInvalidateTeam(companyId);
  return useMutation({
    mutationFn: ({ requestId, decision }: { requestId: string; decision: JoinDecision }) =>
      decideJoinRequest(companyId, requestId, decision),
    onSettled: invalidateTeam,
  });
}

export function useRemoveMember(companyId: string) {
  const invalidateTeam = useInvalidateTeam(companyId);
  return useMutation({
    mutationFn: (userId: string) => removeMember(companyId, userId),
    onSettled: invalidateTeam,
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
