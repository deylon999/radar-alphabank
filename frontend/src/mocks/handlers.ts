import { delay, http, HttpResponse } from 'msw';
import type { z } from 'zod';

import {
  type Company,
  describeCompanyBodySchema,
  DOCUMENT_RULES,
  type ProfileFact,
  updateFactBodySchema,
} from '../schemas/company';
import {
  eventStageSchema,
  askBodySchema,
  feedbackBodySchema,
  insightKindSchema,
  relevanceSchema,
  updateInsightBodySchema,
  urgencySchema,
} from '../schemas/insight';
import { notificationSettingsSchema } from '../schemas/notifications';
import { userRoleSchema } from '../schemas/user';
import { typograph } from '../shared/lib/typography';
import { createAuthHandlers, createGuard } from './auth';
import type { MockDb, MockStore } from './db';
import { extractableFacts, MOCK_NOW, TELEGRAM_DEMO_LINK, TELEGRAM_DEMO_USERNAME } from './fixtures';
import {
  answerQuestion,
  answerSteps,
  searchCompanies,
  compareInsights,
  computeDigest,
  computeOverview,
  computeQualityMetrics,
  extractTextFacts,
  filterInsights,
  paginate,
} from './logic';
import { problem } from './problems';

export interface MockHandlerOptions {
  store: MockStore;
  /** Задержка ответа в мс; 0 — без задержки (тесты). */
  latency: () => number;
  /** Режим ошибок: все ответы — 500. В браузере включается параметром `?mock=errors`. */
  isErrorMode: () => boolean;
}

const API = '*/api';

const error = (status: number, detail: string) => problem(status, detail);
const notFound = () => error(404, 'Не найдено');

async function readJson<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.infer<Schema> | undefined> {
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/** Все значения параметра должны входить в enum, иначе запрос некорректен. */
function readEnumList<Schema extends z.ZodType>(
  params: URLSearchParams,
  key: string,
  schema: Schema,
): z.infer<Schema>[] | null {
  const values: z.infer<Schema>[] = [];
  for (const raw of params.getAll(key)) {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return null;
    }
    values.push(parsed.data);
  }
  return values;
}

function findCompany(db: MockDb, companyId: string): Company | undefined {
  return db.companies.find((company) => company.id === companyId);
}

/** Выдаёт следующие «извлечённые» факты компании — по одному на ссылку или документ. */
function takeExtractableFacts(
  db: MockDb,
  companyId: string,
  sources: ProfileFact['source'][],
): ProfileFact[] {
  const pool = extractableFacts[companyId] ?? [];
  const used = db.extractedCount[companyId] ?? 0;
  const taken = pool.slice(used, used + sources.length);
  db.extractedCount[companyId] = used + taken.length;
  return taken.map(([category, statement], index) => ({
    id: `${companyId}-new${String(db.nextFactNumber++)}`,
    category,
    statement: typograph(statement),
    status: 'pending',
    source: sources[index] ?? { kind: 'text', label: 'Описание компании' },
  }));
}

function extensionOf(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export function createHandlers({ store, latency, isErrorMode }: MockHandlerOptions) {
  /** Общая часть каждого ответа: задержка и режим ошибок. */
  async function prelude(): Promise<Response | undefined> {
    const ms = latency();
    if (ms > 0) {
      await delay(ms);
    }
    return isErrorMode() ? error(500, 'Тестовый режим ошибок (?mock=errors)') : undefined;
  }

  return [
    createGuard(store),
    // Вход и /me режим ошибок не трогает: он нужен, чтобы показать экраны ошибок данных.
    ...createAuthHandlers(store, async () => {
      const ms = latency();
      if (ms > 0) await delay(ms);
      return undefined;
    }),

    http.get(`${API}/companies`, async ({ request }) => {
      const failure = await prelude();
      if (failure) return failure;
      const query = new URL(request.url).searchParams.get('q') ?? '';
      return HttpResponse.json(searchCompanies(store.read().companies, query));
    }),

    http.get<{ companyId: string }>(`${API}/companies/:companyId`, async ({ params }) => {
      const failure = await prelude();
      if (failure) return failure;
      const company = findCompany(store.read(), params.companyId);
      return company ? HttpResponse.json(company) : notFound();
    }),

    http.post<{ companyId: string }>(
      `${API}/companies/:companyId/describe`,
      async ({ params, request }) => {
        const failure = await prelude();
        if (failure) return failure;
        const body = await readJson(request, describeCompanyBodySchema);
        if (!body) return error(400, 'Неверный формат запроса');
        if (body.text === '' && body.links.length === 0) {
          return error(400, 'Опишите компанию или добавьте ссылку');
        }
        if (!findCompany(store.read(), params.companyId)) return notFound();

        let facts: ProfileFact[] = [];
        store.write((db) => {
          const makeId = () => `${params.companyId}-new${String(db.nextFactNumber++)}`;
          const linkSources = body.links.map((link): ProfileFact['source'] => ({
            kind: 'link',
            label: new URL(link).hostname,
          }));
          facts = [
            ...extractTextFacts(body.text, makeId),
            ...takeExtractableFacts(db, params.companyId, linkSources),
          ];
          findCompany(db, params.companyId)?.facts.push(...facts);
        });
        return HttpResponse.json({ facts });
      },
    ),

    http.post<{ companyId: string }>(
      `${API}/companies/:companyId/documents`,
      async ({ params, request }) => {
        const failure = await prelude();
        if (failure) return failure;
        if (!findCompany(store.read(), params.companyId)) return notFound();
        const form = await request.formData();
        const files = form.getAll('files').filter((value): value is File => value instanceof File);
        if (files.length === 0) return error(400, 'Добавьте хотя бы один файл');
        const allowed: readonly string[] = DOCUMENT_RULES.extensions;
        for (const file of files) {
          if (!allowed.includes(extensionOf(file.name))) {
            return error(400, typograph(`Файл "${file.name}": допустимы только PDF, DOCX и TXT`));
          }
          if (file.size > DOCUMENT_RULES.maxSizeBytes) {
            return error(400, typograph(`Файл "${file.name}" больше 10 МБ`));
          }
        }

        let facts: ProfileFact[] = [];
        store.write((db) => {
          const sources = files.map((file): ProfileFact['source'] => ({
            kind: 'document',
            label: file.name,
          }));
          facts = takeExtractableFacts(db, params.companyId, sources);
          findCompany(db, params.companyId)?.facts.push(...facts);
        });
        return HttpResponse.json({ facts });
      },
    ),

    http.patch<{ companyId: string; factId: string }>(
      `${API}/companies/:companyId/facts/:factId`,
      async ({ params, request }) => {
        const failure = await prelude();
        if (failure) return failure;
        const body = await readJson(request, updateFactBodySchema);
        if (!body) return error(400, 'Неверный формат запроса');
        let updated: ProfileFact | undefined;
        store.write((db) => {
          const fact = findCompany(db, params.companyId)?.facts.find(
            (item) => item.id === params.factId,
          );
          if (fact) {
            if (body.status) fact.status = body.status;
            if (body.statement) fact.statement = body.statement;
            updated = fact;
          }
        });
        return updated ? HttpResponse.json(updated) : notFound();
      },
    ),

    http.get<{ companyId: string }>(
      `${API}/companies/:companyId/insights`,
      async ({ params, request }) => {
        const failure = await prelude();
        if (failure) return failure;
        const db = store.read();
        if (!findCompany(db, params.companyId)) return notFound();
        const query = new URL(request.url).searchParams;
        const kind = readEnumList(query, 'kind', insightKindSchema);
        const urgency = readEnumList(query, 'urgency', urgencySchema);
        const stage = readEnumList(query, 'stage', eventStageSchema);
        const relevance = readEnumList(query, 'relevance', relevanceSchema);
        // Роль в моках порядок не меняет, но неизвестное значение — ошибка, как по договору.
        const role = readEnumList(query, 'role', userRoleSchema);
        if (!kind || !urgency || !stage || !relevance || relevance.length > 1 || !role) {
          return error(400, 'Неверные параметры фильтра');
        }
        const items = filterInsights(
          db.insights.filter((insight) => insight.companyId === params.companyId),
          { kind, urgency, stage, relevance: relevance[0], q: query.get('q') ?? undefined },
        ).sort(compareInsights);
        const page = paginate(items, query.get('cursor'));
        return page ? HttpResponse.json(page) : error(400, 'Неверный курсор');
      },
    ),

    http.get<{ companyId: string }>(`${API}/companies/:companyId/digest`, async ({ params }) => {
      const failure = await prelude();
      if (failure) return failure;
      const db = store.read();
      if (!findCompany(db, params.companyId)) return notFound();
      const own = db.insights.filter((insight) => insight.companyId === params.companyId);
      return HttpResponse.json(computeDigest(own, MOCK_NOW));
    }),

    http.get<{ companyId: string }>(`${API}/companies/:companyId/overview`, async ({ params }) => {
      const failure = await prelude();
      if (failure) return failure;
      const db = store.read();
      if (!findCompany(db, params.companyId)) return notFound();
      const own = db.insights.filter((insight) => insight.companyId === params.companyId);
      return HttpResponse.json(computeOverview(own));
    }),

    http.get<{ insightId: string }>(`${API}/insights/:insightId`, async ({ params }) => {
      const failure = await prelude();
      if (failure) return failure;
      const insight = store.read().insights.find((item) => item.id === params.insightId);
      return insight ? HttpResponse.json(insight) : notFound();
    }),

    http.patch<{ insightId: string }>(`${API}/insights/:insightId`, async ({ params, request }) => {
      const failure = await prelude();
      if (failure) return failure;
      const body = await readJson(request, updateInsightBodySchema);
      if (!body) return error(400, 'Неверный формат запроса');
      let updated: MockDb['insights'][number] | undefined;
      store.write((db) => {
        updated = db.insights.find((item) => item.id === params.insightId);
        if (updated) updated.status = body.status;
      });
      return updated ? HttpResponse.json(updated) : notFound();
    }),

    http.post<{ insightId: string }>(
      `${API}/insights/:insightId/feedback`,
      async ({ params, request }) => {
        const failure = await prelude();
        if (failure) return failure;
        const body = await readJson(request, feedbackBodySchema);
        if (!body) return error(400, 'Неверный формат запроса');
        if (!store.read().insights.some((item) => item.id === params.insightId)) return notFound();
        store.write((db) => {
          db.feedback.push({ ...body, insightId: params.insightId, at: new Date().toISOString() });
        });
        return new HttpResponse(null, { status: 204 });
      },
    ),

    http.post<{ insightId: string }>(
      `${API}/insights/:insightId/ask`,
      async ({ params, request }) => {
        const failure = await prelude();
        if (failure) return failure;
        const body = await readJson(request, askBodySchema);
        if (!body) return error(400, 'Вопрос — от 1 до 500 символов');
        const insight = store.read().insights.find((item) => item.id === params.insightId);
        if (!insight) return notFound();
        store.write((db) => {
          db.questions.push({
            insightId: insight.id,
            question: body.question,
            at: new Date().toISOString(),
          });
        });
        const answer = answerQuestion(insight, body.question);
        if (!request.headers.get('Accept')?.includes('text/event-stream')) {
          return HttpResponse.json(answer);
        }
        // Поток как у настоящего агента: шаги по одному с паузой, в конце ответ.
        const encoder = new TextEncoder();
        const events: [name: string, data: unknown][] = [
          ...answerSteps(insight).map((step): [string, unknown] => ['step', step]),
          ['answer', answer],
        ];
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            for (const [name, data] of events) {
              const ms = latency();
              if (ms > 0) await delay(ms);
              controller.enqueue(
                encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`),
              );
            }
            controller.close();
          },
        });
        return new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } });
      },
    ),

    http.get(`${API}/metrics/quality`, async () => {
      return (
        (await prelude()) ?? HttpResponse.json(computeQualityMetrics(store.read(), Date.now()))
      );
    }),

    http.get(`${API}/notifications/settings`, async () => {
      return (await prelude()) ?? HttpResponse.json(store.read().notifications);
    }),

    http.put(`${API}/notifications/settings`, async ({ request }) => {
      const failure = await prelude();
      if (failure) return failure;
      const body = await readJson(request, notificationSettingsSchema);
      if (!body) return error(400, 'Неверный формат настроек');
      store.write((db) => {
        db.notifications = body;
      });
      return HttpResponse.json(body);
    }),

    /** В моке привязка считается подтверждённой сразу: настоящий бэкенд ждёт ответа бота. */
    http.post(`${API}/notifications/telegram/link`, async () => {
      const failure = await prelude();
      if (failure) return failure;
      store.write((db) => {
        db.notifications.telegram = { connected: true, username: TELEGRAM_DEMO_USERNAME };
      });
      return HttpResponse.json({ url: TELEGRAM_DEMO_LINK });
    }),
  ];
}
