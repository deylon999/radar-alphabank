import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../shared/demoAccounts';
import styles from './Auth.module.css';

/** Демо-входы для жюри: владельцы компаний из датасета, без регистрации. */
export function DemoAccounts({ onPick }: { onPick: (email: string, password: string) => void }) {
  return (
    <section className={styles.demo} aria-labelledby="demo-accounts">
      <h2 id="demo-accounts" className={styles.demoTitle}>
        Демо-аккаунты
      </h2>
      <p className={styles.hint}>
        Владельцы компаний из датасета кейса. Пароль у всех: {DEMO_PASSWORD}
      </p>
      <ul className={styles.demoList}>
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              className={styles.demoButton}
              onClick={() => {
                onPick(account.email, DEMO_PASSWORD);
              }}
            >
              <span className={styles.demoEmail}>Войти как {account.email}</span>
              <span className={styles.demoLabel}>{account.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
