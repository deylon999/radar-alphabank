import { USER_ROLES } from '../../schemas/user';
import { userRoleLabels } from '../../shared/labels';

export const POSITION_OPTIONS = USER_ROLES.map((role) => ({
  value: role,
  label: userRoleLabels[role],
}));
