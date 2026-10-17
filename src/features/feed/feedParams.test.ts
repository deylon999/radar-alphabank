import { describe, expect, it } from 'vitest';

import {
  countActiveFilters,
  DEFAULT_FEED_PARAMS,
  parseFeedParams,
  serializeFeedParams,
  toInsightFilters,
} from './feedParams';

const parse = (query: string) => parseFeedParams(new URLSearchParams(query));

describe('фильтры ленты ↔ адрес', () => {
  it('пустой адрес — лента «Главное» без фильтров', () => {
    expect(parse('')).toEqual(DEFAULT_FEED_PARAMS);
  });

  it('читает вкладку, фильтры и поиск', () => {
    expect(
      parse('tab=watch&kind=opportunity&urgency=urgent&urgency=info&stage=decided&q=склад'),
    ).toEqual({
      tab: 'watch',
      kind: ['opportunity'],
      urgency: ['urgent', 'info'],
      stage: ['decided'],
      q: 'склад',
    });
  });

  it('отбрасывает неизвестные значения и повторы, упорядочивает как в enum', () => {
    expect(parse('tab=hack&kind=risk&kind=risk&kind=bogus&urgency=info&urgency=urgent')).toEqual({
      ...DEFAULT_FEED_PARAMS,
      kind: ['risk'],
      urgency: ['urgent', 'info'],
    });
  });

  it('не пишет в адрес значения по умолчанию', () => {
    expect(serializeFeedParams(DEFAULT_FEED_PARAMS).toString()).toBe('');
    expect(serializeFeedParams({ ...DEFAULT_FEED_PARAMS, q: '   ' }).toString()).toBe('');
  });

  it('адрес → состояние → адрес не теряет данных', () => {
    const query = 'tab=watch&kind=risk&kind=opportunity&urgency=important&stage=occurred&q=паводок';

    const roundTrip = serializeFeedParams(parse(query));

    expect(parseFeedParams(roundTrip)).toEqual(parse(query));
    expect(roundTrip.toString()).toBe(new URLSearchParams(query).toString());
  });
});

describe('toInsightFilters', () => {
  it('вкладка задаёт вид связи, пустые фильтры не отправляются', () => {
    expect(toInsightFilters(DEFAULT_FEED_PARAMS)).toEqual({ relevance: 'direct' });
    expect(toInsightFilters({ ...DEFAULT_FEED_PARAMS, tab: 'watch', kind: ['risk'] })).toEqual({
      relevance: 'possible',
      kind: ['risk'],
    });
  });
});

describe('countActiveFilters', () => {
  it('считает выбранные значения и поиск, но не вкладку', () => {
    expect(countActiveFilters({ ...DEFAULT_FEED_PARAMS, tab: 'watch' })).toBe(0);
    expect(
      countActiveFilters({
        ...DEFAULT_FEED_PARAMS,
        kind: ['risk'],
        urgency: ['urgent', 'info'],
        q: 'x',
      }),
    ).toBe(4);
  });
});
