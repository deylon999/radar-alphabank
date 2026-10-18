import { useEffect, useState } from 'react';

import { safeStorage } from '../../shared/lib/safeStorage';
import { useMediaQuery } from '../../shared/lib/useMediaQuery';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'radar-theme';

/**
 * Ставит тему на <html> разом. Кнопки и поля core-components плавно перекрашиваются при
 * смене цветов, каждая со своей скоростью, — без отключения переходов тема «ползёт» по
 * странице рывками. Стили пересчитываются сразу, пока переходы выключены.
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (root.dataset.theme === theme) {
    return;
  }
  root.classList.add('theme-switching');
  root.dataset.theme = theme;
  root.getBoundingClientRect();
  requestAnimationFrame(() => {
    root.classList.remove('theme-switching');
  });
}

function readStoredTheme(): Theme | null {
  const value = safeStorage.get(THEME_STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

/**
 * Тема сайта: выбранная вручную или, пока ничего не выбрано, как в системе. Если вручную
 * вернуться к системной теме, выбор забывается — дальше сайт снова следует за системой.
 * Атрибут data-theme на <html> до первого рендера ставит скрипт в index.html.
 */
export function useTheme() {
  const [stored, setStored] = useState(readStoredTheme);
  const system: Theme = useMediaQuery('(prefers-color-scheme: dark)') ? 'dark' : 'light';
  const theme = stored ?? system;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    if (next === system) {
      safeStorage.remove(THEME_STORAGE_KEY);
      setStored(null);
    } else {
      safeStorage.set(THEME_STORAGE_KEY, next);
      setStored(next);
    }
  };

  return { theme, toggle };
}
