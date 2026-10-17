import { NBSP } from './typography';

/** Формы слова для 1, 2 и 5: «риск», «риска», «рисков». */
export interface PluralForms {
  one: string;
  few: string;
  many: string;
}

const rules = new Intl.PluralRules('ru-RU');
const numberFormat = new Intl.NumberFormat('ru-RU');

export function pluralWord(count: number, forms: PluralForms): string {
  switch (rules.select(count)) {
    case 'one':
      return forms.one;
    case 'few':
      return forms.few;
    case 'many':
      return forms.many;
    default:
      // «other» в русском — дробные числа: «1,5 риска».
      return forms.few;
  }
}

/** Число и слово в правильной форме, неразрывно: «5 рисков». */
export function pluralize(count: number, forms: PluralForms): string {
  return `${numberFormat.format(count)}${NBSP}${pluralWord(count, forms)}`;
}
