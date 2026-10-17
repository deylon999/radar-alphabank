import { NotificationsSummary } from '../../features/notifications/NotificationsSummary';
import { terms } from '../../shared/labels';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { PageTitle } from '../../shared/ui/PageTitle';

export function NotificationsPage() {
  useDocumentTitle(terms.notifications);
  return (
    <>
      <PageTitle>{terms.notifications}</PageTitle>
      <NotificationsSummary />
    </>
  );
}
