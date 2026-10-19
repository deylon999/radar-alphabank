/**
 * Русские подписи всех enum и словарь терминов интерфейса.
 * Одинаковые вещи называются одинаково на всех экранах — берите подписи только отсюда.
 */
import type {
  BankProduct,
  FactCategory,
  FactSourceKind,
  FactStatus,
  PaymentDirection,
  Relationship,
} from '../schemas/company';
import type {
  CitationKind,
  EventStage,
  ImpactRole,
  InsightKind,
  InsightStatus,
  Relevance,
  TraceStepKind,
  Urgency,
} from '../schemas/insight';
import type { DigestFrequency } from '../schemas/notifications';
import type { UserRole } from '../schemas/user';

export const insightKindLabels: Record<InsightKind, string> = {
  risk: 'Риск',
  opportunity: 'Возможность',
};

/** Во множественном числе — для настроек: «Срочно присылать: риски, возможности». */
export const insightKindPluralLabels: Record<InsightKind, string> = {
  risk: 'Риски',
  opportunity: 'Возможности',
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

export const bankProductLabels: Record<BankProduct, string> = {
  settlement: 'Расчётный счёт',
  loan: 'Кредиты',
  leasing: 'Лизинг',
  guarantee: 'Банковские гарантии',
  deposit: 'Депозиты',
  payroll: 'Зарплатный проект',
  factoring: 'Факторинг',
};

export const relationshipLabels: Record<Relationship, string> = {
  client: 'Клиент банка',
  prospect: 'Потенциальный клиент',
  closed: 'Бывший клиент',
};

export const paymentDirectionLabels: Record<PaymentDirection, string> = {
  incoming: 'Платит вам',
  outgoing: 'Получает от вас',
};

export const userRoleLabels: Record<UserRole, string> = {
  owner: 'Собственник',
  ceo: 'Генеральный директор',
  cfo: 'Финансовый директор',
  accountant: 'Главный бухгалтер',
  treasurer: 'Руководитель казначейства',
  other: 'Другая роль',
};

export const traceStepKindLabels: Record<TraceStepKind, string> = {
  plan: 'План',
  tool: 'Данные',
  check: 'Проверка',
  conclusion: 'Вывод',
};

export const citationKindLabels: Record<CitationKind, string> = {
  news: 'Новость',
  bank: 'Аналитика Альфа-Банка',
  client: 'Данные клиента',
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
  describeCompany: 'Расскажите о компании',
  profileFacts: 'Факты о компании',
  profileHint: 'Чем точнее профиль, тем точнее лента',
  telegram: 'Telegram',
  urgentRules: 'Срочные уведомления',
  digest: 'Сводка',
  notificationPreview: 'Так будет выглядеть уведомление',
  bankView: 'Как оценивает Альфа-Банк',
  bankPosition: 'Позиция банка',
  aiConclusion: 'Вывод AI',
  bankRevised: 'Банк пересмотрел оценку',
  materialOutdated: 'Материал устарел',
  noBankView: 'Альфа-Банк не публиковал оценку по этой теме',
  signals: 'Признаки вашей компании в выводе',
  trace: 'Как получен вывод',
  ask: 'Задать вопрос',
  offer: 'Предложение Альфа-Банка',
  clientProfile: 'Данные банка о компании',
  counterparties: 'Крупные контрагенты',
  userRole: 'Ваша роль',
} as const;

/** Формы слов для склонения с числом (см. shared/lib/plural). */
export const pluralForms = {
  risk: { one: 'риск', few: 'риска', many: 'рисков' },
  urgentRisk: { one: 'срочный риск', few: 'срочных риска', many: 'срочных рисков' },
  opportunity: { one: 'возможность', few: 'возможности', many: 'возможностей' },
  source: { one: 'источник', few: 'источника', many: 'источников' },
  fact: { one: 'факт', few: 'факта', many: 'фактов' },
  change: { one: 'изменение', few: 'изменения', many: 'изменений' },
} as const;
