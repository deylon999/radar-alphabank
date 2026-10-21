import { useSelectedCompany } from '../../app/company/selectedCompanyContext';
import { CompanyProfile } from '../../features/company-profile/CompanyProfile';
import { terms } from '../../shared/labels';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { PageTitle } from '../../shared/ui/PageTitle';

export function CompanyPage() {
  const company = useSelectedCompany();
  useDocumentTitle(terms.companyProfile);
  return (
    <>
      <PageTitle>{terms.companyProfile}</PageTitle>
      <CompanyProfile companyId={company.id} />
    </>
  );
}
