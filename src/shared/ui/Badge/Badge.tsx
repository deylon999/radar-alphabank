import cn from 'classnames';
import type { ReactNode } from 'react';

import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'positive' | 'negative' | 'attention' | 'strong' | 'quiet';

interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
}

/**
 * Служебная метка в стиле Status из core-components. Свой компонент, потому что мягкие
 * варианты Status не проходят WCAG AA: серый и красный текст 11 px на светлой подложке
 * дают 4,3:1 и 3,4:1. Здесь цвет несёт подложка, а текст тёмный — от 12:1.
 */
export function Badge({ tone, children }: BadgeProps) {
  return <span className={cn(styles.badge, styles[tone])}>{children}</span>;
}
