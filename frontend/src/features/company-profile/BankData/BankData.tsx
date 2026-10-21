import type { ClientProfile } from '../../../schemas/company';
import {
  bankProductLabels,
  paymentDirectionLabels,
  pluralForms,
  relationshipLabels,
  terms,
} from '../../../shared/labels';
import { formatRubles } from '../../../shared/lib/money';
import { pluralize } from '../../../shared/lib/plural';
import { Badge } from '../../../shared/ui/Badge/Badge';
import styles from './BankData.module.css';

/** «ЧАСТНАЯ СОБСТВЕННОСТЬ» из данных → «Частная собственность». */
function sentenceCase(text: string): string {
  const lower = text.toLocaleLowerCase('ru-RU');
  return lower.charAt(0).toLocaleUpperCase('ru-RU') + lower.slice(1);
}

/**
 * Что банк знает о компании: признаки из его данных, продукты, ВЭД, группа и крупные
 * контрагенты. На этих признаках строятся выводы — их же инсайт показывает в «Признаках».
 */
export function BankData({ profile }: { profile: ClientProfile }) {
  const rows: [string, string][] = [
    ['Отрасль', `${profile.okved.name} (ОКВЭД ${profile.okved.code})`],
    ['Регион', profile.city ? `${profile.city}, ${profile.region}` : profile.region],
    ['Выручка за год', formatRubles(profile.revenue)],
    ...(profile.employees ? [['Сотрудников', profile.employees] as [string, string]] : []),
    ...(profile.ageYears
      ? [['Возраст компании', `${profile.ageYears} лет`] as [string, string]]
      : []),
    ...(profile.stage ? [['Стадия бизнеса', profile.stage] as [string, string]] : []),
    ...(profile.ownership
      ? [['Собственность', sentenceCase(profile.ownership)] as [string, string]]
      : []),
    ['Отношения с банком', relationshipLabels[profile.relationship]],
    [
      'Внешняя торговля',
      profile.foreignTrade ? profile.foreignTrade.countries.join(', ') : 'Нет данных о ВЭД',
    ],
    ...(profile.group
      ? [
          ['Группа компаний', pluralize(profile.group.companies, pluralForms.company)] as [
            string,
            string,
          ],
        ]
      : []),
  ];

  return (
    <section aria-labelledby="bank-data-title" className={styles.root}>
      <h2 id="bank-data-title" className={styles.title}>
        {terms.clientProfile}
      </h2>
      <dl className={styles.rows}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.row}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div className={styles.row}>
          <dt>Продукты банка</dt>
          <dd>
            {profile.products.length > 0 ? (
              <ul className={styles.products} aria-label="Продукты банка">
                {profile.products.map((product) => (
                  <li key={product}>
                    <Badge tone="neutral">{bankProductLabels[product]}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              'Пока нет'
            )}
          </dd>
        </div>
      </dl>

      {profile.counterparties.length > 0 ? (
        <>
          <h3 className={styles.subtitle}>{terms.counterparties}</h3>
          <ul className={styles.counterparties}>
            {profile.counterparties.map((counterparty) => (
              <li
                key={`${counterparty.id}-${counterparty.direction}`}
                className={styles.counterparty}
              >
                <span className={styles.name}>
                  {counterparty.id}
                  {counterparty.industry ? ` · ${counterparty.industry}` : ''}
                </span>
                <span className={styles.muted}>
                  {paymentDirectionLabels[counterparty.direction]} ·{' '}
                  {formatRubles(counterparty.amount)} ·{' '}
                  {pluralize(counterparty.payments, pluralForms.payment)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className={styles.muted}>Данные Альфа-Банка, обезличенные</p>
    </section>
  );
}
