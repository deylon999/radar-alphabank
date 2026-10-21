import { useSelectedCompany } from '../../app/company/selectedCompanyContext';
import { NotificationsSettings } from '../../features/notifications/NotificationsSettings';
import { terms } from '../../shared/labels';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { PageTitle } from '../../shared/ui/PageTitle';

export function NotificationsPage() {
  const company = useSelectedCompany();
  useDocumentTitle(terms.notifications);
  return (
    <>
      <PageTitle>{terms.notifications}</PageTitle>
      <NotificationsSettings companyId={company.id} />
    </>
  );
}
