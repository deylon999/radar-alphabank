import { NBSP } from '../../shared/lib/typography';

/** Доля в процентах без дробей; без знаменателя — прочерк, а не «0 %». */
export function percent(part: number, total: number): string {
  return total > 0 ? `${String(Math.round((part / total) * 100))}${NBSP}%` : '—';
}
