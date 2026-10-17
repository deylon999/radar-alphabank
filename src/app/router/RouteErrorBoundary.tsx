import { Button } from '@alfalab/core-components/button/modern';
import { isRouteErrorResponse, useRouteError } from 'react-router';

import { NotFoundPage } from '../../pages/not-found/NotFoundPage';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { StateMessage } from '../../shared/ui/StateMessage/StateMessage';

/**
 * Ошибка внутри страницы ломает только её: шапка и навигация остаются, можно уйти
 * в другой раздел. «Повторить» перезагружает страницу — так лечится и сбой загрузки чанка.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  useDocumentTitle('Ошибка');

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  return (
    <StateMessage
      role="alert"
      title="Не удалось открыть страницу"
      description="Попробуйте ещё раз. Если ошибка повторится, перейдите в другой раздел."
      action={
        <Button
          view="secondary"
          size={40}
          onClick={() => {
            window.location.reload();
          }}
        >
          Повторить
        </Button>
      }
    />
  );
}
