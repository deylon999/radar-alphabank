import { describe, expect, it } from 'vitest';

import { formatDayMonth, formatFullDate, formatRelativeDate } from './date';

/** Даты в местном времени — тест не зависит от часового пояса машины. */
const local = (month: number, day: number, hour = 12, minute = 0, year = 2026) =>
  new Date(year, month - 1, day, hour, minute).toISOString();
const NOW = new Date(2026, 9, 18, 15, 0);

describe('formatRelativeDate', () => {
  it('сегодня — со временем', () => {
    expect(formatRelativeDate(local(10, 18, 14, 20), NOW)).toBe('сегодня, 14:20');
    expect(formatRelativeDate(local(10, 18, 0, 5), NOW)).toBe('сегодня, 00:05');
  });

  it('вчера — одним словом, даже поздно вечером', () => {
    expect(formatRelativeDate(local(10, 17, 23, 59), NOW)).toBe('вчера');
  });

  it('раньше — день и короткий месяц без точки', () => {
    expect(formatRelativeDate(local(10, 12), NOW)).toBe('12 окт');
    expect(formatRelativeDate(local(5, 3), NOW)).toBe('3 мая');
  });

  it('прошлый год — с годом', () => {
    expect(formatRelativeDate(local(12, 30, 12, 0, 2025), NOW)).toBe('30 дек 2025');
  });
});

describe('formatDayMonth и formatFullDate', () => {
  it('пишут месяц полностью', () => {
    expect(formatDayMonth(local(10, 11))).toBe('11 октября');
    expect(formatFullDate(local(10, 18, 14, 20))).toBe('18 октября 2026 г. в 14:20');
  });
});
