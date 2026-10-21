import { BarChartMIcon } from '@alfalab/icons-glyph/BarChartMIcon';
import { BellMIcon } from '@alfalab/icons-glyph/BellMIcon';
import { ListBulletedMIcon } from '@alfalab/icons-glyph/ListBulletedMIcon';
import { OfficeMIcon } from '@alfalab/icons-glyph/OfficeMIcon';
import type { FC, SVGProps } from 'react';

import { terms } from '../../shared/labels';

export interface NavItem {
  to: string;
  label: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
  /** Только точное совпадение адреса — для ленты на «/». */
  end?: boolean;
  /** Вложенные разделы, при которых пункт тоже подсвечен: инсайт — часть ленты. */
  alsoActiveFor?: readonly string[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: terms.feed, Icon: ListBulletedMIcon, end: true, alsoActiveFor: ['/insights/'] },
  { to: '/overview', label: terms.overview, Icon: BarChartMIcon },
  { to: '/company', label: terms.companyProfile, Icon: OfficeMIcon },
  { to: '/notifications', label: terms.notifications, Icon: BellMIcon },
];
