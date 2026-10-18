import { useNotificationSettings } from '../../api/hooks/notifications';
import { QueryView } from '../../shared/ui/QueryView';
import { PageSkeleton } from '../../shared/ui/Skeleton/PageSkeleton';
import { NotificationPreview } from './NotificationPreview/NotificationPreview';
import styles from './NotificationsSettings.module.css';
import { RulesForm } from './RulesForm/RulesForm';
import { TelegramCard } from './TelegramCard/TelegramCard';

/** Экран уведомлений: Telegram и правила слева, превью сообщения справа. */
export function NotificationsSettings({ companyId }: { companyId: string }) {
  const query = useNotificationSettings();
  return (
    <QueryView
      query={query}
      skeleton={<PageSkeleton blocks={3} />}
      errorTitle="Не удалось загрузить настройки уведомлений"
    >
      {(settings) => (
        <div className={styles.layout}>
          <div className={styles.main}>
            <TelegramCard settings={settings} />
            <RulesForm settings={settings} />
          </div>
          <div className={styles.aside}>
            <NotificationPreview companyId={companyId} settings={settings} />
          </div>
        </div>
      )}
    </QueryView>
  );
}
