import { useSelectedCompany } from '../../app/company/selectedCompanyContext';
import { CompanySummary } from '../../features/company-profile/CompanySummary';
import { terms } from '../../shared/labels';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { PageTitle } from '../../shared/ui/PageTitle';

export function CompanyPage() {
  const company = useSelectedCompany();
  useDocumentTitle(terms.companyProfile);
  return (
    <>
      <PageTitle>{terms.companyProfile}</PageTitle>
      <CompanySummary companyId={company.id} />
    </>
  );
}
