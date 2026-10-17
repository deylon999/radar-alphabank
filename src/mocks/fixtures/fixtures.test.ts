import { describe, expect, it } from 'vitest';

import { companySchema } from '../../schemas/company';
import {
  EVENT_STAGES,
  INSIGHT_KINDS,
  type Insight,
  insightSchema,
  RELEVANCES,
  URGENCIES,
} from '../../schemas/insight';
import { notificationSettingsSchema } from '../../schemas/notifications';
import { companies, COMPANY_IDS, insights, notificationSettings } from './index';

const insightsOf = (companyId: string) => insights.filter((item) => item.companyId === companyId);
const texts = (insight: Insight) => [
  insight.title,
  insight.whyItMatters,
  insight.consequence,
  ...insight.basis,
  ...insight.unknowns,
  ...insight.checks,
];

describe('фикстуры моков', () => {
  it('проходят zod-валидацию', () => {
    for (const company of companies) {
      expect(companySchema.safeParse(company).error).toBeUndefined();
    }
    for (const insight of insights) {
      expect(insightSchema.safeParse(insight).error).toBeUndefined();
    }
    expect(notificationSettingsSchema.safeParse(notificationSettings).success).toBe(true);
  });

  it('три компании, у каждой 8–12 фактов, часть ждёт подтверждения', () => {
    expect(companies).toHaveLength(3);
    for (const company of companies) {
      expect(company.facts.length).toBeGreaterThanOrEqual(8);
      expect(company.facts.length).toBeLessThanOrEqual(12);
      expect(company.facts.some((fact) => fact.status === 'pending')).toBe(true);
    }
  });

  it('25–30 инсайтов покрывают все типы, срочности, стадии и виды связи', () => {
    expect(insights.length).toBeGreaterThanOrEqual(25);
    expect(insights.length).toBeLessThanOrEqual(30);
    expect(new Set(insights.map((item) => item.kind))).toEqual(new Set(INSIGHT_KINDS));
    expect(new Set(insights.map((item) => item.urgency))).toEqual(new Set(URGENCIES));
    expect(new Set(insights.map((item) => item.event.stage))).toEqual(new Set(EVENT_STAGES));
    expect(new Set(insights.map((item) => item.relevance))).toEqual(new Set(RELEVANCES));
    expect(insights.some((item) => item.revisions.length > 0)).toBe(true);
    expect(insights.some((item) => item.sources.length >= 3)).toBe(true);
  });

  it('у каждой компании своя лента с рисками и возможностями', () => {
    for (const companyId of Object.values(COMPANY_IDS)) {
      const own = insightsOf(companyId);
      expect(own.length).toBeGreaterThanOrEqual(5);
      expect(new Set(own.map((item) => item.kind))).toEqual(new Set(INSIGHT_KINDS));
    }
    expect(new Set(insights.map((item) => item.id)).size).toBe(insights.length);
  });

  it('содержит главный демо-сценарий: паводок → склад → поставка → компания', () => {
    const flood = insights.find((item) => item.id === 'agro-flood');

    expect(flood).toMatchObject({ kind: 'risk', urgency: 'urgent', relevance: 'direct' });
    expect(flood?.impactPath.map((step) => step.role)).toEqual([
      'event',
      'asset',
      'supply',
      'company',
    ]);
    expect(flood?.unknowns.join(' ')).toMatch(/работает ли сам склад/i);
    expect(
      flood?.revisions.some((revision) => /склад возобновил работу/i.test(revision.note)),
    ).toBe(true);
  });

  it('цепочка влияния заканчивается компанией, заголовок — до 90 символов', () => {
    for (const insight of insights) {
      expect(insight.impactPath.at(-1)?.role).toBe('company');
      expect(insight.title.length).toBeLessThanOrEqual(90);
    }
  });

  it('источники явно тестовые и ведут на example.com', () => {
    for (const source of insights.flatMap((item) => item.sources)) {
      expect(source.publisher).toMatch(/\(тестовые данные\)$/);
      expect(new URL(source.url).hostname).toBe('example.com');
    }
  });

  it('тексты без оценок вероятности и с русской типографикой', () => {
    for (const text of insights.flatMap(texts)) {
      expect(text).not.toMatch(/вероятност|уверенност/i);
      expect(text).not.toMatch(/["']/);
      expect(text).not.toMatch(/ - /);
    }
  });
});
