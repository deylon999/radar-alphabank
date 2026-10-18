const FIRST_HOUR = 6;
const LAST_HOUR = 22;

/** Время сводки с шагом 30 минут: «06:00» … «22:00». Нестандартное время из настроек тоже в списке. */
export function digestTimeOptions(current: string): string[] {
  const times: string[] = [];
  for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour += 1) {
    const hh = String(hour).padStart(2, '0');
    times.push(`${hh}:00`);
    if (hour < LAST_HOUR) {
      times.push(`${hh}:30`);
    }
  }
  if (!times.includes(current)) {
    times.push(current);
    times.sort();
  }
  return times;
}
