import { DEMO_PASSWORD, DEMO_TOTP_ACCOUNT } from '../../shared/demoAccounts';
import type { MockUser } from '../db';
import { COMPANY_IDS } from './companies';

const owner = (key: keyof typeof COMPANY_IDS, email: string): MockUser => ({
  id: `user-${COMPANY_IDS[key].toLowerCase().replace('_', '')}`,
  email,
  password: DEMO_PASSWORD,
  membership: { companyId: COMPANY_IDS[key], role: 'owner', position: 'ceo' },
  canViewQualityMetrics: true,
});

/** Демо-аккаунты: владельцы четырёх компаний и финдиректор с 2FA. */
export const users: MockUser[] = [
  owner('construction', 'u9250@demo.radar'),
  owner('grain', 'u34911@demo.radar'),
  owner('fuel', 'u26030@demo.radar'),
  owner('beverages', 'u1465@demo.radar'),
  {
    id: 'user-cfo',
    email: DEMO_TOTP_ACCOUNT.email,
    password: DEMO_PASSWORD,
    totp: DEMO_TOTP_ACCOUNT.code,
    membership: { companyId: COMPANY_IDS.construction, role: 'member', position: 'cfo' },
    canViewQualityMetrics: false,
  },
];

export const DEFAULT_USER_ID = 'user-u9250';
