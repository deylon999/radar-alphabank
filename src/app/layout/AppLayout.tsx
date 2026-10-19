import cn from 'classnames';
import { Outlet, ScrollRestoration } from 'react-router';

import { CompanyGate } from '../company/CompanyGate';
import { SelectedCompanyProvider } from '../company/SelectedCompanyProvider';
import { AppHeader } from './AppHeader';
import styles from './AppLayout.module.css';
import { MainNav } from './MainNav';

export const MAIN_CONTENT_ID = 'main-content';

interface AppLayoutProps {
  variant?: 'radar' | 'business';
}

/** Каркас: шапка, контент выбранной компании, нижняя навигация Радара на телефоне. */
export function AppLayout({ variant = 'radar' }: AppLayoutProps) {
  const isRadar = variant === 'radar';
  return (
    <SelectedCompanyProvider>
      <a className={styles.skipLink} href={`#${MAIN_CONTENT_ID}`}>
        Перейти к содержимому
      </a>
      <AppHeader variant={variant} />
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className={cn(styles.main, !isRadar && styles.withoutBottomNav)}
      >
        <CompanyGate>
          <Outlet />
        </CompanyGate>
      </main>
      {isRadar ? <MainNav variant="bottom" /> : null}
      <ScrollRestoration />
    </SelectedCompanyProvider>
  );
}

/** Главная Альфа-Бизнеса: та же оболочка, но шапка банка и без навигации Радара. */
export function BusinessLayout() {
  return <AppLayout variant="business" />;
}
