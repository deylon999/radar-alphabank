import cn from 'classnames';
import { NavLink, useLocation } from 'react-router';

import styles from './MainNav.module.css';
import { NAV_ITEMS } from './navItems';

interface MainNavProps {
  /** header — ссылки в шапке на десктопе; bottom — нижняя панель на телефоне. */
  variant: 'header' | 'bottom';
}

export function MainNav({ variant }: MainNavProps) {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Основная навигация"
      className={cn(variant === 'header' ? styles.header : styles.bottom)}
    >
      <ul className={styles.list}>
        {NAV_ITEMS.map(({ to, label, Icon, end, alsoActiveFor }) => (
          <li key={to} className={styles.item}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  styles.link,
                  (isActive || alsoActiveFor?.some((prefix) => pathname.startsWith(prefix))) &&
                    styles.active,
                )
              }
            >
              {variant === 'bottom' ? <Icon aria-hidden="true" className={styles.icon} /> : null}
              <span className={styles.label}>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
