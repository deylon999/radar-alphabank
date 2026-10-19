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
  insight.bankView?.summary ?? '',
  ...(insight.trace ?? []).map((step) => `${step.title} ${step.detail ?? ''}`),
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

  it('четыре клиента из датасета с профилем банка и фактами, часть ждёт подтверждения', () => {
    expect(companies).toHaveLength(4);
    for (const company of companies) {
      expect(company.id).toMatch(/^U_\d+$/);
      expect(company.profile?.revenue).toBeGreaterThanOrEqual(15e9);
      expect(company.profile?.products.length).toBeGreaterThan(0);
      expect(company.facts.length).toBeGreaterThanOrEqual(4);
      expect(company.facts.some((fact) => fact.status === 'pending')).toBe(true);
    }
  });

  it('16–24 инсайта покрывают все типы, срочности, стадии и виды связи', () => {
    expect(insights.length).toBeGreaterThanOrEqual(16);
    expect(insights.length).toBeLessThanOrEqual(24);
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
      expect(own.length).toBeGreaterThanOrEqual(4);
      expect(new Set(own.map((item) => item.kind))).toEqual(new Set(INSIGHT_KINDS));
    }
    expect(new Set(insights.map((item) => item.id)).size).toBe(insights.length);
  });

  it('содержит главный демо-сценарий: ставка → кредит → компания, оценка банка пересмотрена', () => {
    const rate = insights.find((item) => item.id === 'u9250-key-rate');

    expect(rate).toMatchObject({ kind: 'risk', urgency: 'urgent', relevance: 'direct' });
    expect(rate?.bankView?.material.publishedAt).toBe('2026-09-11T00:00:00Z');
    expect(rate?.bankView?.supersedes?.summary).toMatch(/13,5\s?%/);
    expect(rate?.trace?.map((step) => step.kind)).toContain('check');
    expect(rate?.offer).toBeDefined();
  });

  it('аналитика банка — у большинства инсайтов, устаревший материал помечен', () => {
    const withBank = insights.filter((item) => item.bankView);
    expect(withBank.length).toBeGreaterThanOrEqual(insights.length - 2);
    expect(insights.some((item) => !item.bankView)).toBe(true);
    expect(withBank.some((item) => item.bankView?.material.outdated)).toBe(true);
    expect(withBank.filter((item) => item.bankView?.supersedes).length).toBeGreaterThanOrEqual(2);
    for (const insight of insights) {
      expect(insight.signals?.length).toBeGreaterThan(0);
      expect(insight.trace?.at(-1)?.kind).toBe('conclusion');
    }
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
