import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import type { Company } from '../schemas/company';
import { userRoleSchema } from '../schemas/user';
import { currentUser } from './auth';
import type { MockDb, MockStore, MockUser } from './db';
import { searchCompanies } from './logic';
import { problem } from './problems';
import { companyRef, joinRequestView, membershipView } from './views';

const API = '*/api';
const SEARCH_MIN = 2;

const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  inn: z.string().trim(),
  position: userRoleSchema.optional(),
});
const joinRequestBodySchema = z.object({
  position: userRoleSchema.optional(),
  message: z.string().trim().max(500).optional(),
});
const positionBodySchema = z.object({ position: userRoleSchema });

async function readBody<Schema extends z.ZodType>(request: Request, schema: Schema) {
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

const notMember = () =>
  problem(403, 'Данные компании видят только её участники.', {
    type: '/problems/company-membership-required',
    title: 'Нет доступа к компании',
  });

const ownerOnly = () =>
  problem(403, 'Это может сделать только владелец компании.', {
    type: '/problems/company-owner-required',
    title: 'Нужны права владельца',
  });

/** Компания, к которой относится запрос: из пути или по выводу. */
function companyOfPath(db: MockDb, pathname: string): string | undefined {
  const company = /^\/api\/companies\/([^/]+)/.exec(pathname);
  if (company?.[1]) return decodeURIComponent(company[1]);
  const insight = /^\/api\/insights\/([^/]+)/.exec(pathname);
  if (insight?.[1]) {
    const id = decodeURIComponent(insight[1]);
    return db.insights.find((item) => item.id === id)?.companyId;
  }
  return undefined;
}

/** Заявки шлют чужой компании — их и действия с ними проверяют сами обработчики. */
const OPEN_TO_NON_MEMBERS = /^\/api\/companies\/[^/]+\/join-requests(\/[^/]+\/cancel)?$/;

/**
 * Данные компании — только её участникам, как на настоящем бэкенде. Метрики качества — только
 * команде и экспертам.
 */
export function createMembershipGuard(store: MockStore) {
  return http.all(`${API}/*`, ({ request }) => {
    const { pathname } = new URL(request.url);
    const user = currentUser(store);
    if (!user) return undefined;
    if (pathname === '/api/metrics/quality' && !user.canViewQualityMetrics) {
      return problem(403, 'Метрики качества доступны команде и экспертам.', {
        type: '/problems/quality-reviewer-required',
        title: 'Нет доступа к метрикам',
      });
    }
    if (OPEN_TO_NON_MEMBERS.test(pathname)) return undefined;
    const companyId = companyOfPath(store.read(), pathname);
    if (companyId && user.membership?.companyId !== companyId) {
      return notMember();
    }
    return undefined;
  });
}

function requireUser(store: MockStore): MockUser {
  const user = currentUser(store);
  if (!user) throw new Error('Гард пропустил запрос без входа');
  return user;
}

function blankCompany(id: string, name: string, inn: string): Company {
  return { id, name, inn, description: '', facts: [] };
}

export function createMembershipHandlers(
  store: MockStore,
  prelude: () => Promise<Response | undefined>,
) {
  return [
    http.get(`${API}/companies`, async ({ request }) => {
      const failure = await prelude();
      if (failure) return failure;
      const query = (new URL(request.url).searchParams.get('q') ?? '').trim();
      if (query.length < SEARCH_MIN) {
        return problem(422, `Введите хотя бы ${String(SEARCH_MIN)} символа.`, {
          errors: [{ field: 'q', title: 'TOO_SHORT', description: 'Слишком короткий запрос.' }],
        });
      }
      const db = store.read();
      return HttpResponse.json({
        companies: searchCompanies(db.companies, query).map((company) =>
          companyRef(db, company.id),
        ),
      });
    }),

    http.post(`${API}/companies`, async ({ request }) => {
      const failure = await prelude();
      if (failure) return failure;
      const user = requireUser(store);
      const body = await readBody(request, createCompanySchema);
      if (!body) return problem(400, 'Неверный формат запроса');
      if (!/^(\d{10}|\d{12})$/.test(body.inn)) {
        return problem(422, 'ИНН — 10 цифр для организации или 12 для ИП.', {
          errors: [{ field: 'inn', title: 'INVALID_FORMAT', description: 'ИНН — 10 или 12 цифр.' }],
        });
      }
      if (user.membership) {
        return problem(409, 'Вы уже состоите в компании.', {
          type: '/problems/already-company-member',
          title: 'Уже в компании',
        });
      }
      if (store.read().companies.some((company) => company.inn === body.inn)) {
        return problem(409, 'Компания с таким ИНН уже есть — подайте заявку в неё.', {
          type: '/problems/conflict',
          title: 'Компания уже есть',
        });
      }
      const id = `C_${String(store.read().createdCompanyIds.length + 1)}`;
      store.write((db) => {
        db.companies.push(blankCompany(id, body.name, body.inn));
        db.createdCompanyIds.push(id);
        const me = db.users.find((item) => item.id === user.id);
        if (me)
          me.membership = { companyId: id, role: 'owner', position: body.position ?? 'owner' };
        db.joinRequests
          .filter((item) => item.applicantId === user.id && item.status === 'pending')
          .forEach((item) => {
            item.status = 'cancelled';
          });
      });
      return HttpResponse.json(companyRef(store.read(), id), { status: 201 });
    }),

    http.post<{ companyId: string }>(
      `${API}/companies/:companyId/join-requests`,
      async ({ params, request }) => {
        const failure = await prelude();
        if (failure) return failure;
        const user = requireUser(store);
        const body = await readBody(request, joinRequestBodySchema);
        if (!body) return problem(400, 'Неверный формат запроса');
        const db = store.read();
        if (!db.companies.some((company) => company.id === params.companyId)) {
          return problem(404, 'Компания не найдена.', { type: '/problems/company-not-found' });
        }
        if (user.membership) {
          return problem(409, 'Вы уже состоите в компании.', {
            type: '/problems/already-company-member',
            title: 'Уже в компании',
          });
        }
        if (
          db.joinRequests.some((item) => item.applicantId === user.id && item.status === 'pending')
        ) {
          return problem(409, 'Заявка уже отправлена — дождитесь решения или отмените её.', {
            type: '/problems/join-request-pending',
            title: 'Заявка уже есть',
          });
        }
        const joinRequest = {
          id: `join-${crypto.randomUUID()}`,
          companyId: params.companyId,
          applicantId: user.id,
          status: 'pending' as const,
          ...(body.position ? { position: body.position } : {}),
          ...(body.message ? { message: body.message } : {}),
          createdAt: new Date().toISOString(),
        };
        store.write((draft) => {
          draft.joinRequests.push(joinRequest);
        });
        return HttpResponse.json(joinRequestView(store.read(), joinRequest), { status: 201 });
      },
    ),

    http.get<{ companyId: string }>(
      `${API}/companies/:companyId/join-requests`,
      async ({ params }) => {
        const failure = await prelude();
        if (failure) return failure;
        const user = requireUser(store);
        if (user.membership?.companyId !== params.companyId) return notMember();
        if (user.membership.role !== 'owner') return ownerOnly();
        const db = store.read();
        return HttpResponse.json({
          joinRequests: db.joinRequests
            .filter((item) => item.companyId === params.companyId)
            .map((item) => joinRequestView(db, item)),
        });
      },
    ),

    ...(['approve', 'reject', 'cancel'] as const).map((action) =>
      http.post<{ companyId: string; requestId: string }>(
        `${API}/companies/:companyId/join-requests/:requestId/${action}`,
        async ({ params }) => {
          const failure = await prelude();
          if (failure) return failure;
          const user = requireUser(store);
          const joinRequest = store
            .read()
            .joinRequests.find(
              (item) => item.id === params.requestId && item.companyId === params.companyId,
            );
          if (!joinRequest) {
            return problem(404, 'Заявка не найдена.', { type: '/problems/join-request-not-found' });
          }
          if (action === 'cancel' && joinRequest.applicantId !== user.id) {
            return problem(403, 'Отменить заявку может только тот, кто её подал.', {
              type: '/problems/join-request-applicant-required',
            });
          }
          if (action !== 'cancel') {
            if (user.membership?.companyId !== params.companyId) return notMember();
            if (user.membership.role !== 'owner') return ownerOnly();
          }
          if (joinRequest.status !== 'pending') {
            return problem(409, 'По заявке уже принято решение.', {
              type: '/problems/join-request-not-pending',
            });
          }
          const status = { approve: 'approved', reject: 'rejected', cancel: 'cancelled' } as const;
          store.write((db) => {
            const draft = db.joinRequests.find((item) => item.id === joinRequest.id);
            if (!draft) return;
            draft.status = status[action];
            draft.decidedAt = new Date().toISOString();
            if (action === 'approve') {
              const applicant = db.users.find((item) => item.id === draft.applicantId);
              if (applicant && !applicant.membership) {
                applicant.membership = {
                  companyId: draft.companyId,
                  role: 'member',
                  ...(draft.position ? { position: draft.position } : {}),
                };
              }
            }
          });
          const db = store.read();
          const updated = db.joinRequests.find((item) => item.id === joinRequest.id);
          return HttpResponse.json(updated ? joinRequestView(db, updated) : null);
        },
      ),
    ),

    http.get<{ companyId: string }>(`${API}/companies/:companyId/members`, async ({ params }) => {
      const failure = await prelude();
      if (failure) return failure;
      const db = store.read();
      return HttpResponse.json({
        members: db.users
          .filter((user) => user.membership?.companyId === params.companyId)
          .map((user) => ({
            userId: user.id,
            email: user.email,
            role: user.membership?.role ?? 'member',
            ...(user.membership?.position ? { position: user.membership.position } : {}),
            joinedAt: '2026-10-01T09:00:00Z',
          })),
      });
    }),

    http.delete<{ companyId: string; userId: string }>(
      `${API}/companies/:companyId/members/:userId`,
      async ({ params }) => {
        const failure = await prelude();
        if (failure) return failure;
        const user = requireUser(store);
        const leaving = params.userId === user.id;
        if (leaving && user.membership?.role === 'owner') {
          return problem(
            409,
            'Владелец не может выйти: сначала передайте права другому участнику.',
            {
              type: '/problems/owner-cannot-leave',
            },
          );
        }
        if (!leaving && user.membership?.role !== 'owner') return ownerOnly();
        const target = store
          .read()
          .users.find(
            (item) => item.id === params.userId && item.membership?.companyId === params.companyId,
          );
        if (!target)
          return problem(404, 'Участник не найден.', { type: '/problems/member-not-found' });
        store.write((db) => {
          const draft = db.users.find((item) => item.id === target.id);
          if (draft) draft.membership = undefined;
        });
        return new HttpResponse(null, { status: 204 });
      },
    ),

    http.patch(`${API}/me/membership`, async ({ request }) => {
      const failure = await prelude();
      if (failure) return failure;
      const user = requireUser(store);
      const body = await readBody(request, positionBodySchema);
      if (!body) return problem(400, 'Неверный формат запроса');
      if (!user.membership) {
        return problem(404, 'Вы пока не состоите в компании.', {
          type: '/problems/membership-not-found',
        });
      }
      store.write((db) => {
        const draft = db.users.find((item) => item.id === user.id);
        if (draft?.membership) draft.membership.position = body.position;
      });
      const updated = store.read().users.find((item) => item.id === user.id);
      return HttpResponse.json(updated ? membershipView(store.read(), updated) : null);
    }),
  ];
}
