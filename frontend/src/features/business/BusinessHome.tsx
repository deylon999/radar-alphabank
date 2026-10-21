import type { Company } from '../../schemas/company';
import { bankProductLabels } from '../../shared/labels';
import { formatRubles } from '../../shared/lib/money';
import { Badge } from '../../shared/ui/Badge/Badge';
import styles from './BusinessHome.module.css';
import { RadarWidget } from './RadarWidget';

/** Остаток на счёте для демо: доля годовой выручки, чтобы сумма была правдоподобной. */
const demoBalance = (company: Company) =>
  Math.round((company.profile?.revenue ?? 0) / 90 / 1e5) * 1e5;

/**
 * Главная интернет-банка в упрощённом виде: только то, что нужно показать точку входа
 * в Радар. Счёт — демонстрационный, продукты — из данных банка о клиенте.
 */
export function BusinessHome({ company }: { company: Company }) {
  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <RadarWidget companyId={company.id} />
      </div>
      <div className={styles.aside}>
        <section aria-labelledby="accounts-title" className={styles.block}>
          <h2 id="accounts-title" className={styles.title}>
            Счета
          </h2>
          <div className={styles.account}>
            <span className={styles.muted}>Расчётный счёт ₽ · ••• 4021</span>
            <span className={styles.balance}>{formatRubles(demoBalance(company))}</span>
          </div>
          <p className={styles.muted}>Остаток — демонстрационный</p>
        </section>
        {company.profile?.products.length ? (
          <section aria-labelledby="products-title" className={styles.block}>
            <h2 id="products-title" className={styles.title}>
              Ваши продукты
            </h2>
            <ul className={styles.products}>
              {company.profile.products.map((product) => (
                <li key={product}>
                  <Badge tone="neutral">{bankProductLabels[product]}</Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
