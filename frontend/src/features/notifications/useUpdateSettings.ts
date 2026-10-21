import { useSaveNotificationSettings } from '../../api/hooks/notifications';
import type { NotificationSettings } from '../../schemas/notifications';
import { useToast } from '../../shared/ui/Toast/toastContext';

/** Каждое изменение сохраняется сразу; итог — во всплывающем уведомлении внизу экрана. */
export function useUpdateSettings() {
  const save = useSaveNotificationSettings();
  const showToast = useToast();

  return (next: NotificationSettings, successTitle = 'Сохранено') => {
    save.mutate(next, {
      onSuccess: () => {
        showToast({ title: successTitle });
      },
      onError: () => {
        showToast({ title: 'Не удалось сохранить. Вернули прежнюю настройку' });
      },
    });
  };
}
