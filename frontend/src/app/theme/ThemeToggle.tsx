import { IconButton } from '@alfalab/core-components/icon-button/modern';
import { MoonLineMIcon } from '@alfalab/icons-glyph/MoonLineMIcon';
import { SunLineMIcon } from '@alfalab/icons-glyph/SunLineMIcon';
import type { SVGProps } from 'react';

import { useTheme } from './useTheme';

/** Иконки декоративные: доступное имя и состояние есть у самой кнопки. */
function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return <MoonLineMIcon {...props} aria-hidden="true" />;
}

function SunIcon(props: SVGProps<SVGSVGElement>) {
  return <SunLineMIcon {...props} aria-hidden="true" />;
}

/** Переключатель темы: кнопка-тумблер «Тёмная тема», в тёмной показывает солнце. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  return (
    <IconButton
      icon={dark ? SunIcon : MoonIcon}
      size={40}
      aria-label="Тёмная тема"
      aria-pressed={dark}
      title={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      onClick={toggle}
    />
  );
}
