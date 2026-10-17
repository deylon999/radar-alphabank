/**
 * Русские подписи всех enum и словарь терминов интерфейса.
 * Одинаковые вещи называются одинаково на всех экранах — берите подписи только отсюда.
 */
import type { FactCategory, FactSourceKind, FactStatus } from '../schemas/company';
import type {
  EventStage,
  ImpactRole,
  InsightKind,
  InsightStatus,
  Relevance,
  Urgency,
} from '../schemas/insight';
import type { DigestFrequency } from '../schemas/notifications';

export const insightKindLabels: Record<InsightKind, string> = {
  risk: 'Риск',
  opportunity: 'Возможность',
};

export const urgencyLabels: Record<Urgency, string> = {
  urgent: 'Срочно',
  important: 'Важно',
  info: 'К сведению',
};

export const eventStageLabels: Record<EventStage, string> = {
  occurred: 'Произошло',
  discussed: 'Обсуждается',
  decided: 'Решение принято',
  resolved: 'Ситуация разрешилась',
};

export const relevanceLabels: Record<Relevance, string> = {
  direct: 'Прямая связь',
  possible: 'Возможная связь',
};

export const insightStatusLabels: Record<InsightStatus, string> = {
  new: 'Новое',
  read: 'Прочитано',
  dismissed: 'Скрыто',
};

/** Подписи ролей шагов цепочки влияния: «Событие → Площадка → Поставка → Ваша компания». */
export const impactRoleLabels: Record<ImpactRole, string> = {
  event: 'Событие',
  place: 'Место',
  asset: 'Площадка',
  supply: 'Поставка',
  counterparty: 'Контрагент',
  market: 'Рынок',
  company: 'Ваша компания',
};

export const factCategoryLabels: Record<FactCategory, string> = {
  supplier: 'Поставщики',
  customer: 'Клиенты',
  site: 'Площадки и склады',
  region: 'Регионы',
  product: 'Продукция',
  logistics: 'Логистика',
  finance: 'Финансы',
  other: 'Другое',
};

export const factStatusLabels: Record<FactStatus, string> = {
  confirmed: 'Подтверждено',
  pending: 'Ждёт подтверждения',
  rejected: 'Отклонено',
};

export const factSourceKindLabels: Record<FactSourceKind, string> = {
  text: 'Описание',
  document: 'Документ',
  link: 'Ссылка',
};

export const digestFrequencyLabels: Record<DigestFrequency, string> = {
  daily: 'Каждый день',
  weekly: 'Раз в неделю',
  off: 'Не присылать',
};

/** Словарь терминов: заголовки разделов и повторяющиеся подписи. */
export const terms = {
  productName: 'Радар',
  feed: 'Лента',
  insight: 'Инсайт',
  companyProfile: 'Профиль компании',
  notifications: 'Уведомления',
  mainTab: 'Главное',
  watchTab: 'Под наблюдением',
  whatHappened: 'Что случилось',
  whyItMatters: 'Почему это касается вас',
  consequence: 'Возможное последствие',
  hypothesis: 'Гипотеза',
  hypothesisNote: 'Это предположение системы, а не установленный факт',
  basis: 'Основания',
  unknowns: 'Что неизвестно',
  checks: 'Что проверить',
  sources: 'Источники',
  history: 'История изменений',
  feedback: 'Обратная связь',
  newBadge: 'Новое',
} as const;
