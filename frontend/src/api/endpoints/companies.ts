import {
  type CompanyRef,
  companyRefSchema,
  companySearchSchema,
  type CreateCompanyBody,
  type JoinDecision,
  type JoinRequest,
  type JoinRequestBody,
  joinRequestListSchema,
  joinRequestSchema,
  type Member,
  memberListSchema,
} from '../../schemas/auth';
import {
  type Company,
  companySchema,
  type DescribeCompanyBody,
  type ExtractedFacts,
  extractedFactsSchema,
  type ProfileFact,
  profileFactSchema,
  type UpdateFactBody,
} from '../../schemas/company';
import { request, requestVoid } from '../http';

const companyPath = (companyId: string) => `/api/companies/${encodeURIComponent(companyId)}`;

/** Поиск компании, чтобы подать в неё заявку: от 2 символов названия, ID или ИНН. */
export async function searchCompanies(query: string, signal?: AbortSignal): Promise<CompanyRef[]> {
  const { companies } = await request('/api/companies', companySearchSchema, {
    signal,
    query: { q: query.trim() },
  });
  return companies;
}

export function createCompany(body: CreateCompanyBody): Promise<CompanyRef> {
  return request('/api/companies', companyRefSchema, { method: 'POST', json: body });
}

export function submitJoinRequest(companyId: string, body: JoinRequestBody): Promise<JoinRequest> {
  return request(`${companyPath(companyId)}/join-requests`, joinRequestSchema, {
    method: 'POST',
    json: body,
  });
}

const joinRequestPath = (companyId: string, requestId: string, action: string) =>
  `${companyPath(companyId)}/join-requests/${encodeURIComponent(requestId)}/${action}`;

export function cancelJoinRequest(companyId: string, requestId: string): Promise<JoinRequest> {
  return request(joinRequestPath(companyId, requestId, 'cancel'), joinRequestSchema, {
    method: 'POST',
  });
}

export async function fetchJoinRequests(
  companyId: string,
  signal?: AbortSignal,
): Promise<JoinRequest[]> {
  const { joinRequests } = await request(
    `${companyPath(companyId)}/join-requests`,
    joinRequestListSchema,
    { signal },
  );
  return joinRequests;
}

export function decideJoinRequest(
  companyId: string,
  requestId: string,
  decision: JoinDecision,
): Promise<JoinRequest> {
  return request(joinRequestPath(companyId, requestId, decision), joinRequestSchema, {
    method: 'POST',
  });
}

export async function fetchMembers(companyId: string, signal?: AbortSignal): Promise<Member[]> {
  const { members } = await request(`${companyPath(companyId)}/members`, memberListSchema, {
    signal,
  });
  return members;
}

export function removeMember(companyId: string, userId: string): Promise<void> {
  return requestVoid(`${companyPath(companyId)}/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export function fetchCompany(companyId: string, signal?: AbortSignal): Promise<Company> {
  return request(companyPath(companyId), companySchema, { signal });
}

export function describeCompany(
  companyId: string,
  body: DescribeCompanyBody,
): Promise<ExtractedFacts> {
  return request(`${companyPath(companyId)}/describe`, extractedFactsSchema, {
    method: 'POST',
    json: body,
  });
}

/** Загрузка документов: поле `files`, по одному значению на файл. */
export function uploadCompanyDocuments(
  companyId: string,
  files: readonly File[],
): Promise<ExtractedFacts> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  return request(`${companyPath(companyId)}/documents`, extractedFactsSchema, {
    method: 'POST',
    formData,
    timeoutMs: 60_000,
  });
}

export function updateFact(
  companyId: string,
  factId: string,
  body: UpdateFactBody,
): Promise<ProfileFact> {
  return request(
    `${companyPath(companyId)}/facts/${encodeURIComponent(factId)}`,
    profileFactSchema,
    { method: 'PATCH', json: body },
  );
}
