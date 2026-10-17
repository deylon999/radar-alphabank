import { useSelectedCompany } from '../../app/company/selectedCompanyContext';
import { FeedPreview } from '../../features/feed/FeedPreview';
import { terms } from '../../shared/labels';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { PageTitle } from '../../shared/ui/PageTitle';

export function FeedPage() {
  const company = useSelectedCompany();
  useDocumentTitle(terms.feed);
  return (
    <>
      <PageTitle>{terms.feed}</PageTitle>
      <FeedPreview companyId={company.id} />
    </>
  );
}
