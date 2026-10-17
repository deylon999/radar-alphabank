import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { NotificationSettings } from '../../schemas/notifications';
import {
  fetchNotificationSettings,
  requestTelegramLink,
  saveNotificationSettings,
} from '../endpoints/notifications';
import { queryKeys } from '../queryKeys';

export function useNotificationSettings() {
  return useQuery({
    queryKey: queryKeys.notifications.settings(),
    queryFn: ({ signal }) => fetchNotificationSettings(signal),
  });
}

export function useSaveNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: NotificationSettings) => saveNotificationSettings(settings),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.notifications.settings(), settings);
    },
  });
}

/** Привязку подтверждает бот; статус подключения приходит при следующем запросе настроек. */
export function useTelegramLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestTelegramLink,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.settings() }),
  });
}
