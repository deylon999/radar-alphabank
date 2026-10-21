import { describe, expect, it } from 'vitest';

import { digestTimeOptions } from './digestTimes';

describe('digestTimeOptions', () => {
  it('предлагает время с 06:00 до 22:00 с шагом 30 минут', () => {
    const times = digestTimeOptions('09:00');

    expect(times[0]).toBe('06:00');
    expect(times.at(-1)).toBe('22:00');
    expect(times).toHaveLength(33);
    expect(times).toContain('18:30');
  });

  it('сохраняет нестандартное время из настроек на своём месте', () => {
    const times = digestTimeOptions('07:15');

    expect(times.indexOf('07:15')).toBe(times.indexOf('07:00') + 1);
    expect(digestTimeOptions('23:45').at(-1)).toBe('23:45');
  });
});
