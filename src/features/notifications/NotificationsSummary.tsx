import { Typography } from '@alfalab/core-components/typography/modern';

import { useNotificationSettings } from '../../api/hooks/notifications';
import { digestFrequencyLabels } from '../../shared/labels';
import { QueryView } from '../../shared/ui/QueryView';
import { PageSkeleton } from '../../shared/ui/Skeleton/PageSkeleton';

/** Текущие настройки одной строкой. Управление уведомлениями — в шаге 7. */
export function NotificationsSummary() {
  const query = useNotificationSettings();
  return (
    <QueryView
      query={query}
      skeleton={<PageSkeleton blocks={1} />}
      errorTitle="Не удалось загрузить настройки уведомлений"
    >
      {(settings) => (
        <Typography.Text tag="p" view="primary-medium">
          Telegram: {settings.telegram.connected ? 'подключён' : 'не подключён'}. Сводка:{' '}
          {digestFrequencyLabels[settings.digest].toLocaleLowerCase('ru-RU')}.
        </Typography.Text>
      )}
    </QueryView>
  );
}
