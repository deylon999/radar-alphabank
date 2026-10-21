import { useQuery } from '@tanstack/react-query';

import { fetchQualityMetrics } from '../endpoints/quality';
import { queryKeys } from '../queryKeys';

/** Метрики считаются по живым данным: при каждом открытии экрана — свежие. */
export function useQualityMetrics() {
  return useQuery({
    queryKey: queryKeys.quality(),
    queryFn: ({ signal }) => fetchQualityMetrics(signal),
    refetchOnMount: 'always',
  });
}
