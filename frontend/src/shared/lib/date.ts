/** Все даты интерфейса форматируются здесь — через Intl.DateTimeFormat('ru-RU'). */

import { NBSP } from './typography';

const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const shortDayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const shortDayMonthYear = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const longDayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const longDate = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const fullDateTime = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** «окт.» → «окт», «2026 г.» → «2026»: короткая запись без точек. */
function stripDots(text: string): string {
  return text.replace(/\./g, '').replace(/\s+г$/, '');
}

/** Дата по-человечески: «сегодня, 14:20», «вчера», «12 окт», «12 окт 2025». */
export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days <= 0) {
    return `сегодня, ${timeFormat.format(date)}`;
  }
  if (days === 1) {
    return 'вчера';
  }
  return stripDots(
    date.getFullYear() === now.getFullYear()
      ? shortDayMonth.format(date)
      : shortDayMonthYear.format(date),
  );
}

/** «18 октября» — для сводки «С 18 октября: …». */
export function formatDayMonth(iso: string): string {
  return longDayMonth.format(new Date(iso));
}

/** Дата материала без времени: «11 сентября 2026». Материалы датируются днём, без пояса. */
export function formatLongDate(iso: string): string {
  return stripDots(longDate.format(new Date(iso)));
}

/** Полная дата для подсказки: «18 октября 2026 г. в 14:20». */
export function formatFullDate(iso: string): string {
  return fullDateTime.format(new Date(iso));
}

/** Длительность по-человечески: «50 мин», «3 ч 30 мин», «2 дн 4 ч». */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const days = Math.floor(total / (24 * 60));
  const hours = Math.floor((total % (24 * 60)) / 60);
  const mins = total % 60;
  const parts =
    days > 0
      ? [`${String(days)}${NBSP}дн`, hours > 0 ? `${String(hours)}${NBSP}ч` : '']
      : hours > 0
        ? [`${String(hours)}${NBSP}ч`, mins > 0 ? `${String(mins)}${NBSP}мин` : '']
        : [`${String(mins)}${NBSP}мин`];
  return parts.filter(Boolean).join(' ');
}
