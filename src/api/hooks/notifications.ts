import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

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
 * Сохранение с оптимистичным обновлением: новая настройка видна сразу. Сохранения идут
 * строго по очереди, а ответы применяются только у последнего из них: если быстро кликнуть
 * несколько раз, ответы на промежуточные клики не «проигрывают» старые состояния заново.
 * Если последнее сохранение не прошло, возвращается прежняя настройка и экран сверяется
 * с сервером — ранние сохранения из очереди тоже могли не пройти.
 */
export function useSaveNotificationSettings() {
  const queryClient = useQueryClient();
  const key = queryKeys.notifications.settings();
  const latest = useRef(0);
  return useMutation({
    scope: { id: 'notification-settings' },
    mutationFn: (settings: NotificationSettings) => saveNotificationSettings(settings),
    onMutate: async (settings) => {
      const version = ++latest.current;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationSettings>(key);
      queryClient.setQueryData(key, settings);
      return { previous, version };
    },
    onError: async (_error, _settings, result) => {
      if (result?.version !== latest.current) {
        return;
      }
      if (result.previous) {
        queryClient.setQueryData(key, result.previous);
      }
      await queryClient.invalidateQueries({ queryKey: key });
    },
    onSuccess: (settings, _variables, result) => {
      if (result.version === latest.current) {
        queryClient.setQueryData(key, settings);
      }
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
