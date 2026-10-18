/**
 * Замена библиотеки tldts для моков. MSW проверяет домен cookie через tough-cookie, а тот
 * берёт из tldts одну функцию — getDomain — и тянет справочник всех доменных зон
 * (~250 КБ, больше половины чанка моков). Приложение cookie не использует, поэтому хватает
 * упрощения: регистрируемый домен — два последних уровня имени. Подключается алиасом
 * в vite.config.ts; в сборку для настоящего API моки не попадают вовсе.
 */
export function getDomain(hostname: string): string | null {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (host === '' || /^[\d.]+$/.test(host) || host.includes(':')) {
    return null;
  }
  const labels = host.split('.');
  return labels.length < 2 ? null : labels.slice(-2).join('.');
}
