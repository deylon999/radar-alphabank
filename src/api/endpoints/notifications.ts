import {
  type NotificationSettings,
  notificationSettingsSchema,
  type TelegramLink,
  telegramLinkSchema,
} from '../../schemas/notifications';
import { request } from '../http';

const SETTINGS_PATH = '/api/notifications/settings';

export function fetchNotificationSettings(signal?: AbortSignal): Promise<NotificationSettings> {
  return request(SETTINGS_PATH, notificationSettingsSchema, { signal });
}

export function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<NotificationSettings> {
  return request(SETTINGS_PATH, notificationSettingsSchema, { method: 'PUT', json: settings });
}

/** Ссылка на бота с кодом привязки; пользователь открывает её в Telegram. */
export function requestTelegramLink(): Promise<TelegramLink> {
  return request('/api/notifications/telegram/link', telegramLinkSchema, { method: 'POST' });
}
