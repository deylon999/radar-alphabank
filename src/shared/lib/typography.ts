const NBSP = ' ';

/** Единицы, которые не отрываются от числа: «10 МБ», «40 т», «12 млн». */
const NUMBER_UNIT = /(\d) (МБ|КБ|ГБ|кг|т|км|м|га|млн|млрд|тыс|шт|ч|мин)(?=$|[\s.,;:!?)»“])/g;
const OPENING_CONTEXT = /[\s([{«„—-]/;

/** Прямые кавычки → «ёлочки», вложенные → „лапки“. */
function replaceQuotes(text: string): string {
  let depth = 0;
  let result = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (char !== '"') {
      result += char;
      continue;
    }
    const previous = index === 0 ? ' ' : text.charAt(index - 1);
    const opens = depth === 0 || OPENING_CONTEXT.test(previous);
    if (opens) {
      result += depth === 0 ? '«' : '„';
      depth += 1;
    } else {
      depth = Math.max(0, depth - 1);
      result += depth === 0 ? '»' : '“';
    }
  }
  return result;
}

/** Группы разрядов: «1 250 000» без разрыва строки. */
function bindDigitGroups(text: string): string {
  let current = text;
  let previous = '';
  while (current !== previous) {
    previous = current;
    current = current.replace(/(\d) (\d{3})(?!\d)/g, `$1${NBSP}$2`);
  }
  return current;
}

/**
 * Русская типографика для текстов интерфейса и моков: «ёлочки», длинное тире с неразрывным
 * пробелом перед ним, неразрывный пробел перед «₽», после «№» и между числом и единицей.
 */
export function typograph(text: string): string {
  let result = replaceQuotes(text);
  result = result.replace(/ +(?:-{1,2}|—) +/g, `${NBSP}— `);
  result = result.replace(/№ ?(?=\S)/g, `№${NBSP}`);
  result = result.replace(/(\d) ?₽/g, `$1${NBSP}₽`);
  result = result.replace(NUMBER_UNIT, `$1${NBSP}$2`);
  return bindDigitGroups(result);
}
