import { QueryClient } from '@tanstack/react-query';

import { isApiError } from './ApiError';

const MAX_RETRIES = 2;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) =>
          failureCount < MAX_RETRIES && (!isApiError(error) || error.isRetryable),
      },
      mutations: { retry: false },
    },
  });
}
