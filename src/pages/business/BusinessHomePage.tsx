import { useSelectedCompany } from '../../app/company/selectedCompanyContext';
import { BusinessHome } from '../../features/business/BusinessHome';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { PageTitle } from '../../shared/ui/PageTitle';

export function BusinessHomePage() {
  const company = useSelectedCompany();
  useDocumentTitle('Альфа-Бизнес');

  return (
    <>
      <PageTitle>Главная</PageTitle>
      <BusinessHome company={company} />
    </>
  );
}
