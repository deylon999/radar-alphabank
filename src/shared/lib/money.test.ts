import { describe, expect, it } from 'vitest';

import { formatRubles } from './money';
import { NBSP } from './typography';

describe('formatRubles', () => {
  it('сокращает крупные суммы и не отрывает единицы от числа', () => {
    expect(formatRubles(62_340_483_339)).toBe(`62,3${NBSP}млрд${NBSP}₽`);
    expect(formatRubles(842_000_000)).toBe(`842${NBSP}млн${NBSP}₽`);
    expect(formatRubles(2_748_000_000)).toBe(`2,7${NBSP}млрд${NBSP}₽`);
    expect(formatRubles(26_000)).toBe(`26${NBSP}тыс.${NBSP}₽`);
    expect(formatRubles(950)).toBe(`950${NBSP}₽`);
  });
});
