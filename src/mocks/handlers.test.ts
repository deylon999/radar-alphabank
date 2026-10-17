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
const AGRO = COMPANY_IDS.agro;

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

describe('моки ленты', () => {
  it('ставит срочные первыми, остальные — по дате обновления', async () => {
    const { items } = await fetchInsights(AGRO, {}, null);
    const firstRegular = items.findIndex((item) => item.urgency !== 'urgent');

    expect(items[0]?.id).toBe('agro-flood');
    expect(items.slice(0, firstRegular).every((item) => item.urgency === 'urgent')).toBe(true);
    const regularDates = items.slice(firstRegular).map((item) => Date.parse(item.updatedAt));
    expect(regularDates).toEqual([...regularDates].sort((a, b) => b - a));
  });

  it('фильтрует по типу, связи и тексту', async () => {
    const opportunities = await fetchInsights(AGRO, { kind: ['opportunity'] }, null);
    const possible = await fetchInsights(AGRO, { relevance: 'possible' }, null);
    const search = await fetchInsights(AGRO, { q: 'ЮЖНЫЙ-2' }, null);

    expect(opportunities.items.every((item) => item.kind === 'opportunity')).toBe(true);
    expect(possible.items.every((item) => item.relevance === 'possible')).toBe(true);
    expect(search.items.map((item) => item.id)).toEqual(['agro-flood']);
  });

  it('отдаёт ленту страницами по курсору без повторов', async () => {
    const pages = [await fetchInsights(AGRO, {}, null)];
    for (let cursor = pages[0]?.nextCursor; cursor; cursor = pages.at(-1)?.nextCursor) {
      pages.push(await fetchInsights(AGRO, {}, cursor));
    }

    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0]?.items).toHaveLength(PAGE_SIZE);
    const ids = pages.flatMap((page) => page.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(11);
  });

  it('у разных компаний разные ленты', async () => {
    const agro = await fetchInsights(AGRO, {}, null);
    const retail = await fetchInsights(COMPANY_IDS.retail, {}, null);

    expect(agro.items.every((item) => item.companyId === AGRO)).toBe(true);
    expect(retail.items.every((item) => item.companyId === COMPANY_IDS.retail)).toBe(true);
  });

  it('скрытый инсайт пропадает из ленты и сводки, а после отмены возвращается', async () => {
    const before = await fetchDigest(AGRO);
    await updateInsightStatus('agro-flood', 'dismissed');

    const hidden = await fetchInsights(AGRO, {}, null);
    expect(hidden.items.some((item) => item.id === 'agro-flood')).toBe(false);
    expect((await fetchDigest(AGRO)).urgentRisks).toBe(before.urgentRisks - 1);

    await updateInsightStatus('agro-flood', 'new');
    expect((await fetchInsights(AGRO, {}, null)).items[0]?.id).toBe('agro-flood');
  });

  it('считает в сводке вкладку «Главное»: все риски вместе со срочными', async () => {
    const digest = await fetchDigest(AGRO);
    const main = await fetchInsights(AGRO, { relevance: 'direct', kind: ['risk'] }, null);

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
    const { facts } = await describeCompany(AGRO, {
      text: 'Главный склад находится в Приреченске. Ок.',
      links: ['https://example.com/about'],
    });

    expect(facts).toHaveLength(2);
    expect(facts.every((fact) => fact.status === 'pending')).toBe(true);
    expect(facts[0]).toMatchObject({ category: 'site', source: { kind: 'text' } });
    expect(facts[1]?.source).toEqual({ kind: 'link', label: 'example.com' });
    const company = await fetchCompany(AGRO);
    expect(company.facts.map((fact) => fact.id)).toEqual(
      expect.arrayContaining(facts.map((fact) => fact.id)),
    );
  });

  it('отклоняет пустое описание без ссылок', async () => {
    await expect(describeCompany(AGRO, { text: '', links: [] })).rejects.toMatchObject({
      kind: 'http',
      status: 400,
    });
  });

  it('принимает PDF и отклоняет неподдерживаемый формат', async () => {
    const pdf = new File(['%PDF'], 'Договор.pdf', { type: 'application/pdf' });
    const image = new File(['img'], 'фото.png', { type: 'image/png' });

    const { facts } = await uploadCompanyDocuments(AGRO, [pdf]);
    expect(facts[0]?.source).toEqual({ kind: 'document', label: 'Договор.pdf' });
    await expect(uploadCompanyDocuments(AGRO, [image])).rejects.toMatchObject({ status: 400 });
  });

  it('подтверждает и исправляет факт', async () => {
    const confirmed = await updateFact(AGRO, 'polevea-agro-f7', { status: 'confirmed' });
    const edited = await updateFact(AGRO, 'polevea-agro-f7', { statement: 'Новая формулировка' });

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

    const error: unknown = await fetchInsights(AGRO, {}, null).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'http', status: 500 });
  });
});
