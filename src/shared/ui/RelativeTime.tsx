import { formatFullDate, formatRelativeDate } from '../lib/date';

interface RelativeTimeProps {
  iso: string;
  className?: string;
}

/** «сегодня, 14:20» на экране, полная дата — в подсказке и в атрибуте datetime. */
export function RelativeTime({ iso, className }: RelativeTimeProps) {
  return (
    <time dateTime={iso} title={formatFullDate(iso)} className={className}>
      {formatRelativeDate(iso)}
    </time>
  );
}
