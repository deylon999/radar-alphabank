import type { Insight } from '../../schemas/insight';
import type { NotificationSettings } from '../../schemas/notifications';
import { agroInsights } from './insights-agro';
import { buildingInsights } from './insights-building';
import { retailInsights } from './insights-retail';

export { companies, COMPANY_IDS, extractableFacts } from './companies';
export { MOCK_NOW } from './define';

export const insights: Insight[] = [...agroInsights, ...buildingInsights, ...retailInsights];

export const notificationSettings: NotificationSettings = {
  telegram: { connected: false },
  urgentKinds: ['risk'],
  digest: 'daily',
  digestTime: '09:00',
};

/** Ссылка привязки — заглушка: настоящую выдаёт бэкенд. */
export const TELEGRAM_DEMO_LINK = 'https://example.com/telegram-demo';
export const TELEGRAM_DEMO_USERNAME = 'demo_director';
