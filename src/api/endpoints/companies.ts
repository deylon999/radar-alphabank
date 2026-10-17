import {
  type Company,
  companyListSchema,
  companySchema,
  type DescribeCompanyBody,
  type ExtractedFacts,
  extractedFactsSchema,
  type ProfileFact,
  profileFactSchema,
  type UpdateFactBody,
} from '../../schemas/company';
import { request } from '../http';

const companyPath = (companyId: string) => `/api/companies/${encodeURIComponent(companyId)}`;

export function fetchCompanies(signal?: AbortSignal): Promise<Company[]> {
  return request('/api/companies', companyListSchema, { signal });
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
