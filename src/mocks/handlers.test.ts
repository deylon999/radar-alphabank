/** @vitest-environment node */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { ApiError } from '../api/ApiError';
import {
  describeCompany,
  fetchCompany,
  updateFact,
  uploadCompanyDocuments,
} from '../api/endpoints/companies';
import {
  askInsight,
  fetchDigest,
  fetchInsight,
  fetchInsights,
  updateInsightStatus,
} from '../api/endpoints/insights';
import {
  fetchNotificationSettings,
  requestTelegramLink,
  saveNotificationSettings,
} from '../api/endpoints/notifications';
import { createMockServer } from '../test/mockServer';
import { COMPANY_IDS } from './fixtures';
import { PAGE_SIZE } from './logic';

const { server, store, setErrorMode } = createMockServer();
const MAIN = COMPANY_IDS.construction;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  store.reset();
  setErrorMode(false);
});
afterAll(() => {
  server.close();
});

describe('вопрос по инсайту', () => {
  it('отвечает со ссылками на банк, данные клиента и новость', async () => {
    const answer = await askInsight('u9250-key-rate', { question: 'Что будет при ставке 12%?' });

    expect(answer.question).toBe('Что будет при ставке 12%?');
    expect(answer.answer).toMatch(/^Позиция Альфа-Банка: ждём сохранения ставки 14,0%/);
    expect(answer.citations.map((citation) => citation.kind)).toEqual(['bank', 'client', 'news']);
  });

  it('не опирается на устаревший материал и отклоняет пустой вопрос', async () => {
    const answer = await askInsight('u9250-steel', { question: 'Что с ценами на металл?' });
    expect(answer.answer).toMatch(/^Свежей аналитики Альфа-Банка по этой теме нет/);
    expect(answer.citations.some((citation) => citation.kind === 'bank')).toBe(false);

    await expect(askInsight('u9250-key-rate', { question: '' })).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('моки ленты', () => {
  it('ставит срочные первыми, остальные — по дате обновления', async () => {
    const { items } = await fetchInsights(MAIN, {}, null);
    const firstRegular = items.findIndex((item) => item.urgency !== 'urgent');

    expect(items[0]?.id).toBe('u9250-key-rate');
    expect(items.slice(0, firstRegular).every((item) => item.urgency === 'urgent')).toBe(true);
    const regularDates = items.slice(firstRegular).map((item) => Date.parse(item.updatedAt));
    expect(regularDates).toEqual([...regularDates].sort((a, b) => b - a));
  });

  it('фильтрует по типу, связи и тексту', async () => {
    const opportunities = await fetchInsights(MAIN, { kind: ['opportunity'] }, null);
    const possible = await fetchInsights(MAIN, { relevance: 'possible' }, null);
    const search = await fetchInsights(MAIN, { q: 'ЮАНЯХ' }, null);

    expect(opportunities.items.every((item) => item.kind === 'opportunity')).toBe(true);
    expect(possible.items.every((item) => item.relevance === 'possible')).toBe(true);
    expect(search.items.map((item) => item.id)).toEqual(['u9250-yuan']);
  });

  it('отдаёт ленту страницами по курсору без повторов', async () => {
    const pages = [await fetchInsights(MAIN, {}, null)];
    for (let cursor = pages[0]?.nextCursor; cursor; cursor = pages.at(-1)?.nextCursor) {
      pages.push(await fetchInsights(MAIN, {}, cursor));
    }

    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0]?.items).toHaveLength(PAGE_SIZE);
    const ids = pages.flatMap((page) => page.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(7);
  });

  it('у разных компаний разные ленты', async () => {
    const main = await fetchInsights(MAIN, {}, null);
    const grain = await fetchInsights(COMPANY_IDS.grain, {}, null);

    expect(main.items.every((item) => item.companyId === MAIN)).toBe(true);
    expect(grain.items.every((item) => item.companyId === COMPANY_IDS.grain)).toBe(true);
  });

  it('скрытый инсайт пропадает из ленты и сводки, а после отмены возвращается', async () => {
    const before = await fetchDigest(MAIN);
    await updateInsightStatus('u9250-key-rate', 'dismissed');

    const hidden = await fetchInsights(MAIN, {}, null);
    expect(hidden.items.some((item) => item.id === 'u9250-key-rate')).toBe(false);
    expect((await fetchDigest(MAIN)).urgentRisks).toBe(before.urgentRisks - 1);

    await updateInsightStatus('u9250-key-rate', 'new');
    expect((await fetchInsights(MAIN, {}, null)).items[0]?.id).toBe('u9250-key-rate');
  });

  it('считает в сводке вкладку «Главное»: все риски вместе со срочными', async () => {
    const digest = await fetchDigest(MAIN);
    const main = await fetchInsights(MAIN, { relevance: 'direct', kind: ['risk'] }, null);

    expect(digest.risks).toBe(main.items.length);

    expect(digest.urgentRisks).toBeGreaterThan(0);
    expect(digest.risks).toBeGreaterThanOrEqual(digest.urgentRisks);
    expect(digest.opportunities).toBeGreaterThan(0);
  });

  it('возвращает 404 для неизвестного инсайта', async () => {
    await expect(fetchInsight('missing')).rejects.toMatchObject({ kind: 'http', status: 404 });
  });
});

describe('моки профиля компании', () => {
  it('описание компании превращается в факты «ждёт подтверждения»', async () => {
    const { facts } = await describeCompany(MAIN, {
      text: 'Главный склад находится в Приреченске. Ок.',
      links: ['https://example.com/about'],
    });

    expect(facts).toHaveLength(2);
    expect(facts.every((fact) => fact.status === 'pending')).toBe(true);
    expect(facts[0]).toMatchObject({ category: 'site', source: { kind: 'text' } });
    expect(facts[1]?.source).toEqual({ kind: 'link', label: 'example.com' });
    const company = await fetchCompany(MAIN);
    expect(company.facts.map((fact) => fact.id)).toEqual(
      expect.arrayContaining(facts.map((fact) => fact.id)),
    );
  });

  it('отклоняет пустое описание без ссылок', async () => {
    await expect(describeCompany(MAIN, { text: '', links: [] })).rejects.toMatchObject({
      kind: 'http',
      status: 400,
    });
  });

  it('принимает PDF и отклоняет неподдерживаемый формат', async () => {
    const pdf = new File(['%PDF'], 'Договор.pdf', { type: 'application/pdf' });
    const image = new File(['img'], 'фото.png', { type: 'image/png' });

    const { facts } = await uploadCompanyDocuments(MAIN, [pdf]);
    expect(facts[0]?.source).toEqual({ kind: 'document', label: 'Договор.pdf' });
    await expect(uploadCompanyDocuments(MAIN, [image])).rejects.toMatchObject({ status: 400 });
  });

  it('подтверждает и исправляет факт', async () => {
    const confirmed = await updateFact(MAIN, 'U_9250-f4', { status: 'confirmed' });
    const edited = await updateFact(MAIN, 'U_9250-f4', { statement: 'Новая формулировка' });

    expect(confirmed.status).toBe('confirmed');
    expect(edited).toMatchObject({ status: 'confirmed', statement: 'Новая формулировка' });
  });
});

describe('моки уведомлений', () => {
  it('сохраняет настройки', async () => {
    const settings = await fetchNotificationSettings();
    await saveNotificationSettings({ ...settings, digest: 'weekly', digestTime: '18:30' });

    expect(await fetchNotificationSettings()).toMatchObject({
      digest: 'weekly',
      digestTime: '18:30',
    });
  });

  it('выдаёт ссылку-заглушку и отмечает Telegram подключённым', async () => {
    const { url } = await requestTelegramLink();

    expect(url).toBe('https://example.com/telegram-demo');
    expect((await fetchNotificationSettings()).telegram.connected).toBe(true);
  });
});

describe('режим ошибок', () => {
  it('все запросы получают ApiError http 500', async () => {
    setErrorMode(true);

    const error: unknown = await fetchInsights(MAIN, {}, null).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'http', status: 500 });
  });
});
