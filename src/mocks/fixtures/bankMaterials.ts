import type { BankMaterial } from '../../schemas/insight';

/**
 * Аналитические материалы Альфа-Банка из кейса. В моках — только название, дата и короткие
 * выжимки в инсайтах: сами отчёты принадлежат банку, их нельзя копировать в репозиторий.
 */
export const BANK_MATERIALS = {
  'policy-rate-2026-09-11': {
    title: 'Ключевая ставка ЦБ РФ: ставка без изменения на 14,0%, риторика стала жёстче',
    publishedAt: '2026-09-11T00:00:00Z',
  },
  'macro-7m26': {
    title: 'Макростатистика 7М26: данные по рынку труда не подтверждают охлаждения экономики',
    publishedAt: '2026-09-07T00:00:00Z',
  },
  'macro-1h26': {
    title: 'Макростатистика 1П26: слабый рост смещает прогноз роста ВВП на 0,1% за год',
    publishedAt: '2026-07-31T00:00:00Z',
  },
  consumption: {
    title: 'Потребление на пике',
    publishedAt: '2026-08-05T00:00:00Z',
  },
  'inflation-2026-08-31': {
    title: 'Инфляция 25–31 августа: основные выводы',
    publishedAt: '2026-09-02T00:00:00Z',
  },
  'bond-brief-2026-09-14': {
    title: 'Бонд Бриф: итоги недели',
    publishedAt: '2026-09-14T00:00:00Z',
  },
  'fi-strategy-3q26': {
    title: 'Тактический взгляд на 3-й квартал 2026 года: время собирать камни',
    publishedAt: '2026-07-22T00:00:00Z',
  },
  'russian-steel-1q21': {
    title: 'Российская сталь: ралли цен продолжается, прогноз результатов за 1К21',
    publishedAt: '2021-04-15T00:00:00Z',
    outdated: true,
  },
} satisfies Record<string, Omit<BankMaterial, 'id' | 'page'>>;

export type BankMaterialKey = keyof typeof BANK_MATERIALS;
