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

/**
 * Сохранение с оптимистичным обновлением: новая настройка видна сразу, а если сервер
 * её не принял — возвращается прежняя. Сохранения идут строго по очереди, поэтому
 * откат не затрёт изменение, сделанное позже.
 */
export function useSaveNotificationSettings() {
  const queryClient = useQueryClient();
  const key = queryKeys.notifications.settings();
  return useMutation({
    scope: { id: 'notification-settings' },
    mutationFn: (settings: NotificationSettings) => saveNotificationSettings(settings),
    onMutate: async (settings) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationSettings>(key);
      queryClient.setQueryData(key, settings);
      return { previous };
    },
    onError: (_error, _settings, result) => {
      if (result?.previous) {
        queryClient.setQueryData(key, result.previous);
      }
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(key, settings);
    },
  });
}

/**
 * Привязку подтверждает бот, когда пользователь нажмёт «Старт» в Telegram. Статус приходит
 * при следующем запросе настроек — его делает экран, когда пользователь возвращается.
 */
export function useTelegramLink() {
  return useMutation({ mutationFn: requestTelegramLink });
}
