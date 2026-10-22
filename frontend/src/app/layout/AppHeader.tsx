import { Link } from 'react-router';

import { terms } from '../../shared/labels';
import { LogoutButton } from '../auth/LogoutButton';
import { CompanySwitcher } from '../company/CompanySwitcher';
import { ThemeToggle } from '../theme/ThemeToggle';
import styles from './AppHeader.module.css';
import { MainNav } from './MainNav';

const BUSINESS_HOME = '/business';

interface AppHeaderProps {
  /** Шапка Радара или главной Альфа-Бизнеса, откуда пользователь входит в Радар. */
  variant?: 'radar' | 'business';
}

export function AppHeader({ variant = 'radar' }: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {variant === 'business' ? (
          <>
            <Link to={BUSINESS_HOME} className={styles.logo}>
              Альфа-Бизнес
            </Link>
            <nav aria-label="Разделы банка" className={styles.businessNav}>
              <Link to="/" className={styles.radarLink}>
                {terms.productName}
              </Link>
            </nav>
          </>
        ) : (
          <>
            <Link to={BUSINESS_HOME} className={styles.back}>
              Альфа-Бизнес
            </Link>
            <Link to="/" className={styles.logo}>
              {terms.productName}
            </Link>
            <MainNav variant="header" />
          </>
        )}
        <div className={styles.actions}>
          <CompanySwitcher />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
