import { describe, expect, it } from 'vitest';

import { pluralize } from './plural';
import { NBSP } from './typography';

const RISK = { one: 'риск', few: 'риска', many: 'рисков' };

describe('pluralize', () => {
  it.each([
    [0, 'рисков'],
    [1, 'риск'],
    [2, 'риска'],
    [4, 'риска'],
    [5, 'рисков'],
    [11, 'рисков'],
    [12, 'рисков'],
    [21, 'риск'],
    [22, 'риска'],
    [25, 'рисков'],
    [101, 'риск'],
  ])('%i → %s', (count, word) => {
    expect(pluralize(count, RISK)).toBe(`${String(count)}${NBSP}${word}`);
  });

  it('группирует разряды больших чисел', () => {
    const grouped = new Intl.NumberFormat('ru-RU').format(1250);

    expect(grouped).not.toBe('1250');
    expect(pluralize(1250, RISK)).toBe(`${grouped}${NBSP}рисков`);
  });
});
