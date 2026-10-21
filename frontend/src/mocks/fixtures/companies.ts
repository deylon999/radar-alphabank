import type { Company, ProfileFact } from '../../schemas/company';
import { typograph } from '../../shared/lib/typography';
import { defineFacts } from './define';

/**
 * Клиенты из обезличенного датасета кейса (df_Uid_data_hack.csv) — выручка от 15 млрд ₽.
 * Признаки профиля взяты из данных как есть. Контрагенты — по два крупнейших получателя и
 * плательщика из df_Uid_payment_hack.csv без переводов самому себе; отрасль — если контрагент
 * есть в датасете компаний. Факты — то, что пользователь мог рассказать о компании сам.
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
          id: 'U_9972',
          direction: 'outgoing',
          amount: 799_650_000,
          payments: 32,
        },
        {
          id: 'U_151404',
          direction: 'outgoing',
          amount: 684_267_000,
          payments: 364,
        },
        {
          id: 'U_130843',
          direction: 'incoming',
          amount: 27_671_000,
          payments: 2,
        },
        {
          id: 'U_29399',
          direction: 'incoming',
          amount: 4_266_000,
          payments: 5,
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
          id: 'U_4754',
          direction: 'outgoing',
          amount: 588_353_000,
          payments: 266,
        },
        {
          id: 'U_153112',
          direction: 'outgoing',
          amount: 558_397_000,
          payments: 35,
        },
        {
          id: 'U_231389',
          direction: 'incoming',
          amount: 10_045_000,
          payments: 1,
        },
        {
          id: 'U_238493',
          direction: 'incoming',
          amount: 706_000,
          payments: 2,
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
          id: 'U_55096',
          direction: 'outgoing',
          amount: 1_428_664_000,
          payments: 57,
        },
        {
          id: 'U_201949',
          direction: 'outgoing',
          amount: 844_774_000,
          payments: 103,
        },
        {
          id: 'U_196945',
          direction: 'incoming',
          amount: 6_671_673_000,
          payments: 150,
          industry: 'Строительство железных дорог и метро',
        },
        {
          id: 'U_186926',
          direction: 'incoming',
          amount: 458_679_000,
          payments: 74,
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
          id: 'U_46045',
          direction: 'outgoing',
          amount: 5_436_510_000,
          payments: 99,
          industry: 'Торговля оптовая напитками',
        },
        {
          id: 'U_58777',
          direction: 'outgoing',
          amount: 64_530_000,
          payments: 56,
          industry: 'Деятельность рекламных агентств прочая',
        },
        {
          id: 'U_104090',
          direction: 'incoming',
          amount: 2_979_637_000,
          payments: 227,
        },
        {
          id: 'U_139642',
          direction: 'incoming',
          amount: 1_082_236_000,
          payments: 300,
          industry: 'Торговля розничная текстильными изделиями в специализированных магазинах',
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
