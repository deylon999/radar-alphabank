import { useEffect, useRef } from 'react';

import { useNotificationSettings, useTelegramLink } from '../../../api/hooks/notifications';
import type { NotificationSettings } from '../../../schemas/notifications';
import { useToast } from '../../../shared/ui/Toast/toastContext';
import { useUpdateSettings } from '../useUpdateSettings';

/**
 * Подключение Telegram: «Подключить» → ссылка на бота → пользователь нажимает «Старт»
 * в Telegram и возвращается. Пока ждём бота, статус перезапрашивается при возврате во вкладку
 * и по кнопке «Проверить подключение».
 */
export function useTelegramConnection(settings: NotificationSettings) {
  const link = useTelegramLink();
  const query = useNotificationSettings();
  const update = useUpdateSettings();
  const showToast = useToast();
  const { connected } = settings.telegram;
  const linkUrl = connected ? null : (link.data?.url ?? null);
  const waiting = linkUrl !== null;
  const { refetch } = query;
  const { reset: resetLink } = link;

  useEffect(() => {
    if (!waiting) return undefined;
    const check = () => {
      if (document.visibilityState === 'visible') {
        void refetch();
      }
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [waiting, refetch]);

  // Бот подтвердил привязку, пока пользователь ждал, — сообщаем об этом.
  const wasWaiting = useRef(false);
  useEffect(() => {
    if (wasWaiting.current && connected) {
      showToast({ title: 'Telegram подключён' });
      resetLink();
    }
    wasWaiting.current = waiting;
  }, [waiting, connected, showToast, resetLink]);

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast({ title: 'Ссылка скопирована' });
    } catch {
      showToast({ title: 'Не удалось скопировать. Выделите ссылку вручную' });
    }
  };

  return {
    connected,
    username: settings.telegram.username,
    linkUrl,
    requestLink: () => {
      link.mutate();
    },
    isRequestingLink: link.isPending,
    linkFailed: link.isError,
    copyLink,
    check: async () => {
      const result = await refetch();
      if (result.data && !result.data.telegram.connected) {
        showToast({ title: 'Бот ещё не подтвердил привязку. Нажмите «Старт» в Telegram' });
      }
    },
    isChecking: query.isFetching,
    disconnect: () => {
      update({ ...settings, telegram: { connected: false } }, 'Telegram отключён');
    },
  };
}
