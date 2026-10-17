import { Outlet, ScrollRestoration } from 'react-router';

import { CompanyGate } from '../company/CompanyGate';
import { SelectedCompanyProvider } from '../company/SelectedCompanyProvider';
import { AppHeader } from './AppHeader';
import styles from './AppLayout.module.css';
import { MainNav } from './MainNav';

export const MAIN_CONTENT_ID = 'main-content';

/** Каркас: шапка, контент выбранной компании, нижняя навигация на телефоне. */
export function AppLayout() {
  return (
    <SelectedCompanyProvider>
      <a className={styles.skipLink} href={`#${MAIN_CONTENT_ID}`}>
        Перейти к содержимому
      </a>
      <AppHeader />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className={styles.main}>
        <CompanyGate>
          <Outlet />
        </CompanyGate>
      </main>
      <MainNav variant="bottom" />
      <ScrollRestoration />
    </SelectedCompanyProvider>
  );
}
