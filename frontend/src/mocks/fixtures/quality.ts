import type { MockDb } from '../db';
import { hoursAgo } from './define';

/**
 * Тестовые отзывы и вопросы, чтобы экран метрик не был пустым в демо. Экран об этом
 * предупреждает; отзывы и вопросы из вкладки добавляются к ним.
 */
export const demoFeedback: MockDb['feedback'] = [
  { insightId: 'u9250-key-rate', useful: true, at: hoursAgo(30) },
  {
    insightId: 'u9250-key-rate',
    useful: true,
    comment: 'Сразу пересчитали бюджет процентов на 4 квартал',
    at: hoursAgo(29),
  },
  { insightId: 'u9250-yuan', useful: true, at: hoursAgo(26) },
  {
    insightId: 'u9250-steel',
    useful: false,
    comment: 'Оценка банка 2021 года, по стали нужно что-то свежее',
    at: hoursAgo(20),
  },
  { insightId: 'u34911-export', useful: true, at: hoursAgo(18) },
  {
    insightId: 'u34911-port',
    useful: false,
    comment: 'Про Тамань знали из новостей раньше, чем пришло уведомление',
    at: hoursAgo(12),
  },
  { insightId: 'u26030-gasoline', useful: true, at: hoursAgo(9) },
  { insightId: 'u26030-leasing', useful: true, at: hoursAgo(7) },
  {
    insightId: 'u1465-ruble',
    useful: true,
    comment: 'Полезно, что видно, у кого из поставщиков цены в евро',
    at: hoursAgo(5),
  },
  { insightId: 'u1465-trade-result', useful: false, at: hoursAgo(3) },
];

export const demoQuestions: MockDb['questions'] = [
  { insightId: 'u9250-key-rate', question: 'Что будет при ставке 12%?', at: hoursAgo(28) },
  {
    insightId: 'u34911-credit',
    question: 'Есть ли льготные программы на закупку урожая?',
    at: hoursAgo(16),
  },
  { insightId: 'u26030-gasoline', question: 'Могут ли ввести запрет экспорта?', at: hoursAgo(8) },
  { insightId: 'u1465-ruble', question: 'Как зафиксировать курс на полгода?', at: hoursAgo(4) },
];
