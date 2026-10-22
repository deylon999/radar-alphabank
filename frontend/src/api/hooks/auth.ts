import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '../ApiError';
import type { Me } from '../../schemas/auth';
import {
  fetchMe,
  login,
  logout,
  register,
  updatePosition,
  verifySecondFactor,
} from '../endpoints/auth';
import { queryKeys } from '../queryKeys';

/** 401 — не ошибка, а «не вошёл»: тогда `data` — `null`. */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async ({ signal }) => {
      try {
        return await fetchMe(signal);
      } catch (error) {
        if (isApiError(error) && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Вход и выход меняют пользователя целиком: данные прежнего не должны мелькнуть у нового,
 * поэтому кеш очищается, а пользователь загружается заново.
 */
function useResetSession() {
  const queryClient = useQueryClient();
  return async () => {
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.me[0] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.me });
  };
}

export function useLogin() {
  const resetSession = useResetSession();
  return useMutation({
    mutationFn: login,
    onSuccess: async (result) => {
      if (result.status === 'authenticated') {
        await resetSession();
      }
    },
  });
}

export function useVerifySecondFactor() {
  const resetSession = useResetSession();
  return useMutation({ mutationFn: verifySecondFactor, onSuccess: resetSession });
}

export function useRegister() {
  return useMutation({ mutationFn: register });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, null);
    },
  });
}

/**
 * Должность в компании: от неё бэкенд поднимает выше то, что важнее для роли. Меняется сразу,
 * при ошибке возвращается прежняя.
 */
export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePosition,
    onMutate: async (position) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.me });
      const previous = queryClient.getQueryData<Me | null>(queryKeys.me);
      if (previous?.membership) {
        queryClient.setQueryData<Me>(queryKeys.me, {
          ...previous,
          membership: { ...previous.membership, position },
        });
      }
      return { previous };
    },
    onError: (_error, _position, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.me, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}
