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
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: terms.feed, Icon: ListBulletedMIcon, end: true },
  { to: '/company', label: terms.companyProfile, Icon: OfficeMIcon },
  { to: '/notifications', label: terms.notifications, Icon: BellMIcon },
];
