import type { Insight } from '../../schemas/insight';
import type { NotificationSettings } from '../../schemas/notifications';
import { beveragesInsights } from './insights-beverages';
import { constructionInsights } from './insights-construction';
import { fuelInsights } from './insights-fuel';
import { grainInsights } from './insights-grain';

export { companies, COMPANY_IDS, extractableFacts } from './companies';
export { MOCK_NOW } from './define';
export { demoFeedback, demoQuestions } from './quality';
export { DEFAULT_USER_ID, joinRequests, NEWCOMER_ID, users } from './users';

export const insights: Insight[] = [
  ...constructionInsights,
  ...grainInsights,
  ...fuelInsights,
  ...beveragesInsights,
];

export const notificationSettings: NotificationSettings = {
  telegram: { connected: false },
  urgentKinds: ['risk'],
  digest: 'daily',
  digestTime: '09:00',
};

/** Ссылка привязки — заглушка: настоящую выдаёт бэкенд. */
export const TELEGRAM_DEMO_LINK = 'https://example.com/telegram-demo';
export const TELEGRAM_DEMO_USERNAME = 'demo_director';
