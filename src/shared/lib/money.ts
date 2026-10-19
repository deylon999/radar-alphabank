import { NBSP } from './typography';

const oneDecimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

const SCALES = [
  [1e12, 'трлн'],
  [1e9, 'млрд'],
  [1e6, 'млн'],
  [1e3, 'тыс.'],
] as const;

/** Крупные суммы коротко: «62,3 млрд ₽», «842 млн ₽», «26 тыс. ₽». */
export function formatRubles(amount: number): string {
  for (const [scale, unit] of SCALES) {
    if (Math.abs(amount) >= scale) {
      const value = amount / scale;
      const text = value >= 100 ? whole.format(value) : oneDecimal.format(value);
      return `${text}${NBSP}${unit}${NBSP}₽`;
    }
  }
  return `${whole.format(amount)}${NBSP}₽`;
}
