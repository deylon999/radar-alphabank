import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { type FeedParams, parseFeedParams, serializeFeedParams } from './feedParams';

/**
 * Фильтры ленты в адресе. Меняются с replace, чтобы «Назад» вело на предыдущую страницу,
 * а не перебирало состояния фильтров; возврат из карточки сохраняет фильтры.
 */
export function useFeedParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseFeedParams(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<FeedParams>) => {
      setSearchParams((current) => serializeFeedParams({ ...parseFeedParams(current), ...patch }), {
        replace: true,
        // Переключение фильтра не должно прокручивать страницу наверх.
        preventScrollReset: true,
      });
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => {
    update({ kind: [], urgency: [], stage: [], q: '' });
  }, [update]);

  return { params, update, resetFilters };
}
