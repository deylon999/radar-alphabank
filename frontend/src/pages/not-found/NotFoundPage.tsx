import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { ButtonLink } from '../../shared/ui/ButtonLink';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageTitle } from '../../shared/ui/PageTitle';

export function NotFoundPage() {
  useDocumentTitle('Страница не найдена');
  return (
    <>
      <PageTitle>Страница не найдена</PageTitle>
      <EmptyState
        title="Такой страницы нет"
        description={'Возможно, ссылка устарела. Важное по вашей компании\u00a0— в ленте.'}
        action={
          <ButtonLink to="/" view="secondary" size={40}>
            Открыть ленту
          </ButtonLink>
        }
      />
    </>
  );
}
