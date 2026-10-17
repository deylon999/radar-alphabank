import { Link } from 'react-router';

import { terms } from '../../shared/labels';
import { CompanySwitcher } from '../company/CompanySwitcher';
import styles from './AppHeader.module.css';
import { MainNav } from './MainNav';

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          {terms.productName}
        </Link>
        <MainNav variant="header" />
        <div className={styles.switcher}>
          <CompanySwitcher />
        </div>
      </div>
    </header>
  );
}
