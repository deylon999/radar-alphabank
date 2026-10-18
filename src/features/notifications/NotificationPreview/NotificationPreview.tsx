import { useInsightFeed } from '../../../api/hooks/insights';
import type { Insight } from '../../../schemas/insight';
import type { NotificationSettings } from '../../../schemas/notifications';
import { insightKindLabels, terms, urgencyLabels } from '../../../shared/labels';
import { QueryView } from '../../../shared/ui/QueryView';
import { SkeletonLines } from '../../../shared/ui/Skeleton/SkeletonLines';
import { SettingsSection } from '../SettingsSection';
import styles from './NotificationPreview.module.css';

const SKELETON = [40, 90, 80, 60] as const;

/**
 * Сообщение в том виде, в каком его пришлёт бот: суть, почему касается, первое действие.
 * Последствие не показываем: в коротком сообщении его не подписать «Гипотеза» как следует.
 */
function Message({ insight }: { insight: Insight }) {
  const firstCheck = insight.checks[0];
  return (
    <figure className={styles.message} aria-label="Пример уведомления">
      <p className={styles.meta}>
        Радар · {urgencyLabels[insight.urgency]} · {insightKindLabels[insight.kind]}
      </p>
      <p className={styles.headline}>{insight.title}</p>
      <p className={styles.body}>{insight.whyItMatters}</p>
      {firstCheck ? <p className={styles.body}>Что проверить: {firstCheck}</p> : null}
      <p className={styles.action}>Открыть в Радаре</p>
    </figure>
  );
}

interface NotificationPreviewProps {
  companyId: string;
  settings: NotificationSettings;
}

/** Превью срочного уведомления на настоящем инсайте выбранной компании. */
export function NotificationPreview({ companyId, settings }: NotificationPreviewProps) {
  const enabled = settings.urgentKinds.length > 0;
  const query = useInsightFeed(companyId, { urgency: ['urgent'], kind: settings.urgentKinds });
  const first = query.data?.pages[0]?.items[0];

  return (
    <SettingsSection title={terms.notificationPreview}>
      {enabled ? (
        <QueryView
          query={{ ...query, data: query.data ? (first ?? null) : undefined }}
          skeleton={<SkeletonLines widths={SKELETON} />}
          errorTitle="Не удалось загрузить пример"
          isEmpty={(insight) => insight === null}
          empty={
            <p className={styles.muted}>
              Сейчас срочного нет. Когда появится, уведомление придёт сразу.
            </p>
          }
        >
          {(insight) => (insight ? <Message insight={insight} /> : null)}
        </QueryView>
      ) : (
        <p className={styles.muted}>
          Срочные уведомления выключены. Отметьте риски или возможности в&nbsp;правилах.
        </p>
      )}
    </SettingsSection>
  );
}
