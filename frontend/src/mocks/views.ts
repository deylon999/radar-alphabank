import type { CompanyRef, JoinRequest, Me, Membership } from '../schemas/auth';
import type { MockDb, MockJoinRequest, MockUser } from './db';

export function companyRef(db: MockDb, companyId: string): CompanyRef {
  const company = db.companies.find((item) => item.id === companyId);
  return {
    id: companyId,
    name: company?.name ?? companyId,
    ...(company?.inn ? { inn: company.inn } : {}),
    origin: db.createdCompanyIds.includes(companyId) ? 'user' : 'dataset',
  };
}

export function joinRequestView(db: MockDb, request: MockJoinRequest): JoinRequest {
  const applicant = db.users.find((user) => user.id === request.applicantId);
  return {
    id: request.id,
    company: companyRef(db, request.companyId),
    applicant: { id: request.applicantId, email: applicant?.email ?? request.applicantId },
    status: request.status,
    ...(request.position ? { position: request.position } : {}),
    ...(request.message ? { message: request.message } : {}),
    createdAt: request.createdAt,
    ...(request.decidedAt ? { decidedAt: request.decidedAt } : {}),
  };
}

export function membershipView(db: MockDb, user: MockUser): Membership | null {
  const { membership } = user;
  if (!membership) return null;
  return {
    company: companyRef(db, membership.companyId),
    role: membership.role,
    ...(membership.position ? { position: membership.position } : {}),
    joinedAt: '2026-10-01T09:00:00Z',
  };
}

/** Заявка, которую стоит показать: ждёт решения или отклонена (отменённые не показываем). */
function currentJoinRequest(db: MockDb, user: MockUser): MockJoinRequest | undefined {
  return db.joinRequests
    .filter((request) => request.applicantId === user.id && request.status !== 'cancelled')
    .at(-1);
}

export function meOf(db: MockDb, user: MockUser): Me {
  const request = user.membership ? undefined : currentJoinRequest(db, user);
  return {
    user: { id: user.id, email: user.email, twoFactorEnabled: Boolean(user.totp) },
    membership: membershipView(db, user),
    joinRequest: request ? joinRequestView(db, request) : null,
    canViewQualityMetrics: user.canViewQualityMetrics,
  };
}
