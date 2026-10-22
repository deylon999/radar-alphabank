import { Link, Outlet } from 'react-router';

import { terms } from '../../shared/labels';
import { ThemeToggle } from '../theme/ThemeToggle';
import styles from './AuthLayout.module.css';

/** Вход и регистрация: шапка без разделов, форма по центру. */
export function AuthLayout() {
  return (
    <>
      <header className={styles.header}>
        <Link to="/login" className={styles.logo}>
          {terms.productName}
        </Link>
        <ThemeToggle />
      </header>
      <main className={styles.main}>
        <div className={styles.card}>
          <Outlet />
        </div>
      </main>
    </>
  );
}
