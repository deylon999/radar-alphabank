import type { Company, ProfileFact } from '../../schemas/company';
import { typograph } from '../../shared/lib/typography';
import { defineFacts } from './define';

/**
 * Клиенты из обезличенного датасета кейса (df_Uid_data_hack.csv) — выручка от 15 млрд ₽.
 * Признаки профиля взяты из данных как есть. Контрагенты — тоже компании датасета, а суммы
 * платежей синтетические: файла платежей в моках нет. Факты — то, что пользователь мог
 * рассказать о компании сам; с данными банка они не спорят.
 */
export const COMPANY_IDS = {
  construction: 'U_9250',
  grain: 'U_34911',
  fuel: 'U_26030',
  beverages: 'U_1465',
} as const;

const doc = (label: string): ProfileFact['source'] => ({ kind: 'document', label });
const link = (label: string): ProfileFact['source'] => ({ kind: 'link', label });

export const companies: Company[] = [
  {
    id: COMPANY_IDS.construction,
    name: 'Клиент U_9250',
    industry: 'Строительство инженерных сооружений',
    description: typograph(
      'Строим дороги, мосты и инженерные сети в Иркутской области по госконтрактам и для промышленных заказчиков. Спецтехнику закупаем в Китае.',
    ),
    profile: {
      okved: {
        code: '42.99',
        name: 'Строительство прочих инженерных сооружений, не включённых в другие группировки',
      },
      region: 'Иркутская область',
      city: 'Иркутск',
      revenue: 62_340_483_339,
      employees: 'Более 251',
      ageYears: '16–25',
      stage: 'Бизнес в новой реальности',
      ownership: 'Частная собственность',
      relationship: 'client',
      products: ['settlement', 'loan', 'leasing', 'guarantee', 'payroll'],
      foreignTrade: { countries: ['Китай'] },
      group: { id: 'group_133188_sb', companies: 22 },
      counterparties: [
        {
          id: 'U_158',
          direction: 'outgoing',
          amount: 2_748_000_000,
          payments: 64,
          industry: 'Оптовая торговля машинами и оборудованием',
        },
        {
          id: 'U_3125',
          direction: 'outgoing',
          amount: 1_120_500_000,
          payments: 131,
          industry: 'Производство строительных изделий из бетона',
        },
        {
          id: 'U_4909',
          direction: 'incoming',
          amount: 6_538_000_000,
          payments: 28,
          industry: 'Производство электроэнергии',
        },
      ],
    },
    facts: defineFacts(COMPANY_IDS.construction, [
      [
        'customer',
        'Около половины выручки — региональные дорожные госконтракты, остальное — заказы промышленных компаний',
        'confirmed',
      ],
      [
        'supplier',
        'Экскаваторы и самосвалы закупаются в Китае с оплатой в юанях',
        'confirmed',
        doc('Контракт поставки техники 2026.pdf'),
      ],
      [
        'logistics',
        'Сезон работ — с мая по октябрь, зимой техника стоит на базе в Иркутске',
        'confirmed',
      ],
      [
        'logistics',
        'Технику на объекты доставляют по железной дороге до Тайшета',
        'pending',
        link('example.com/u9250/about'),
      ],
      [
        'finance',
        'Основной кредит — с плавающей ставкой: ключевая ставка плюс 2,5 п. п.',
        'confirmed',
      ],
      ['finance', 'Спецтехника в лизинге с фиксированными платежами в рублях', 'pending'],
      ['other', 'Компания готовится к первому выпуску облигаций в 2027 году', 'pending'],
    ]),
  },
  {
    id: COMPANY_IDS.grain,
    name: 'Клиент U_34911',
    industry: 'Оптовая торговля зерном',
    description: typograph(
      'Закупаем пшеницу и подсолнечник у хозяйств Юга России и продаём на экспорт — в ОАЭ, Алжир и Индию. Закупки урожая кредитуем.',
    ),
    profile: {
      okved: {
        code: '46.21',
        name: 'Торговля оптовая зерном, необработанным табаком, семенами и кормами для сельскохозяйственных животных',
      },
      region: 'Ростовская область',
      city: 'Ростов-на-Дону',
      revenue: 53_868_155_228,
      employees: '16–100',
      ageYears: '16–25',
      stage: 'Бизнес в новой реальности',
      ownership: 'Частная собственность',
      relationship: 'client',
      products: ['settlement', 'loan'],
      foreignTrade: { countries: ['ОАЭ', 'Алжир', 'Индия'] },
      counterparties: [
        {
          id: 'U_30698',
          direction: 'outgoing',
          amount: 3_904_000_000,
          payments: 212,
          industry: 'Выращивание зерновых и масличных культур',
        },
        {
          id: 'U_120022',
          direction: 'outgoing',
          amount: 1_655_000_000,
          payments: 87,
          industry: 'Выращивание зерновых и масличных культур',
        },
        {
          id: 'U_377',
          direction: 'outgoing',
          amount: 284_000_000,
          payments: 46,
          industry: 'Хранение и складирование',
        },
      ],
    },
    facts: defineFacts(COMPANY_IDS.grain, [
      ['customer', 'Экспорт — около 80 % выручки, расчёты в долларах и дирхамах', 'confirmed'],
      ['supplier', 'Зерно закупается у 40 хозяйств Ростовской области и Кубани', 'confirmed'],
      [
        'finance',
        'Закупка урожая финансируется сезонной кредитной линией',
        'confirmed',
        doc('Кредитный договор 2026.pdf'),
      ],
      ['logistics', 'Отгрузка на экспорт — через порты Азовского и Чёрного морей', 'confirmed'],
      [
        'logistics',
        'Зерно хранится на арендованных элеваторах',
        'pending',
        link('example.com/u34911/about'),
      ],
    ]),
  },
  {
    id: COMPANY_IDS.fuel,
    name: 'Клиент U_26030',
    industry: 'Оптовая торговля моторным топливом',
    description: typograph(
      'Покупаем бензин и дизель у НПЗ Башкортостана и продаём АЗС и транспортным компаниям Урала и Поволжья. Часть дизеля уходит на экспорт.',
    ),
    profile: {
      okved: {
        code: '46.71.2',
        name: 'Торговля оптовая моторным топливом, включая авиационный бензин',
      },
      region: 'Республика Башкортостан',
      city: 'Уфа',
      revenue: 60_403_064_363,
      employees: '16–100',
      ageYears: '8–15',
      stage: 'Оптимизация',
      ownership: 'Частная собственность',
      relationship: 'client',
      products: ['settlement', 'loan', 'leasing'],
      foreignTrade: { countries: ['Грузия', 'Латвия', 'Польша'] },
      counterparties: [
        {
          id: 'U_768',
          direction: 'incoming',
          amount: 4_891_400_000,
          payments: 140,
          industry: 'Перевозка грузов спецтранспортом',
        },
        {
          id: 'U_1188',
          direction: 'incoming',
          amount: 1_114_300_000,
          payments: 463,
          industry: 'Перевозка грузов спецтранспортом',
        },
        {
          id: 'U_1142',
          direction: 'outgoing',
          amount: 526_000_000,
          payments: 40,
          industry: 'Хранение и складирование',
        },
      ],
    },
    facts: defineFacts(COMPANY_IDS.fuel, [
      ['supplier', 'Основной поставщик — два НПЗ в Башкортостане', 'confirmed'],
      ['customer', 'Около 60 % продаж — независимые АЗС, остальное — перевозчики', 'confirmed'],
      [
        'logistics',
        'Бензовозы в лизинге, платежи привязаны к ключевой ставке',
        'confirmed',
        doc('Договор лизинга.pdf'),
      ],
      ['customer', 'Экспорт дизеля — около 10 % выручки', 'pending'],
      ['site', 'Нефтебаза на 20 тыс. кубометров под Уфой', 'confirmed'],
    ]),
  },
  {
    id: COMPANY_IDS.beverages,
    name: 'Клиент U_1465',
    industry: 'Оптовая торговля напитками',
    description: typograph(
      'Импортируем вино, минеральную воду и соки из Грузии и Азербайджана и развозим по торговым сетям и ресторанам Москвы и области.',
    ),
    profile: {
      okved: { code: '46.34', name: 'Торговля оптовая напитками' },
      region: 'Москва',
      city: 'Москва',
      revenue: 44_401_187_115,
      employees: 'Более 251',
      ageYears: '16–25',
      stage: 'Оптимизация',
      ownership: 'Частная собственность',
      relationship: 'client',
      products: ['settlement', 'loan', 'leasing'],
      foreignTrade: { countries: ['Грузия', 'Азербайджан', 'Туркменистан'] },
      group: { id: 'group_134460_sb', companies: 215 },
      counterparties: [
        {
          id: 'U_2521',
          direction: 'incoming',
          amount: 7_313_000_000,
          payments: 981,
          industry: 'Розничная торговля продуктами',
        },
        {
          id: 'U_3665',
          direction: 'incoming',
          amount: 2_160_000_000,
          payments: 526,
          industry: 'Оптовая торговля продуктами и напитками',
        },
        {
          id: 'U_377',
          direction: 'outgoing',
          amount: 842_000_000,
          payments: 19,
          industry: 'Хранение и складирование',
        },
      ],
    },
    facts: defineFacts(COMPANY_IDS.beverages, [
      ['supplier', 'Около 70 % закупок — импорт из Грузии и Азербайджана', 'confirmed'],
      ['customer', 'Три федеральные сети дают около половины выручки', 'confirmed'],
      [
        'finance',
        'Закупки у иностранных поставщиков оплачиваются в долларах',
        'confirmed',
        doc('Контракт с поставщиком.pdf'),
      ],
      ['site', 'Склад класса А в Подмосковье, 18 тыс. м²', 'confirmed'],
      ['logistics', 'Собственный автопарк — 60 грузовиков, часть в лизинге', 'pending'],
    ]),
  },
];

/**
 * Факты, которые мок «извлекает» из ссылок и документов: по одному на ссылку или файл,
 * пока запас не кончится. Настоящий разбор делает бэкенд.
 */
export const extractableFacts: Record<string, [ProfileFact['category'], string][]> = {
  [COMPANY_IDS.construction]: [
    ['customer', 'Подрядчик по ремонту трёх мостов на трассе Иркутск — Чита'],
    ['finance', 'Банковские гарантии обеспечивают исполнение госконтрактов'],
    ['supplier', 'Бетон поставляет местный завод ЖБИ'],
  ],
  [COMPANY_IDS.grain]: [
    ['customer', 'Крупнейший покупатель — трейдер в ОАЭ, около 30 % экспорта'],
    ['logistics', 'Зерно до порта возят нанятые зерновозы'],
    ['finance', 'Валютную выручку продаём в течение месяца после отгрузки'],
  ],
  [COMPANY_IDS.fuel]: [
    ['customer', 'Крупнейший клиент — сеть из 45 АЗС в Челябинской области'],
    ['logistics', 'Часть топлива поставляется по железной дороге'],
    ['finance', 'Отсрочка платежа для АЗС — до 14 дней'],
  ],
  [COMPANY_IDS.beverages]: [
    ['customer', 'Рестораны и кафе — около 20 % выручки'],
    ['logistics', 'Импорт везут фурами через Верхний Ларс'],
    ['product', 'Собственная марка минеральной воды — около 8 % продаж'],
  ],
};
