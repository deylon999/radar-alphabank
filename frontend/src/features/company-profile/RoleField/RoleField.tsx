import { USER_ROLES } from '../../../schemas/user';
import { terms, userRoleLabels } from '../../../shared/labels';
import { useUserRole } from '../../../shared/lib/userRole';
import { NativeSelectField } from '../../../shared/ui/NativeSelectField/NativeSelectField';
import styles from './RoleField.module.css';

const OPTIONS = USER_ROLES.map((role) => ({ value: role, label: userRoleLabels[role] }));

/** У одной компании несколько пользователей: от роли зависит, что в ленте выше. */
export function RoleField() {
  const [role, setRole] = useUserRole();
  return (
    <section aria-labelledby="role-title" className={styles.root}>
      <h2 id="role-title" className={styles.title}>
        {terms.userRole}
      </h2>
      <p className={styles.muted}>Лента поднимает выше то, что важнее для вашей роли.</p>
      <NativeSelectField
        label="Роль в компании"
        size={48}
        value={role}
        options={OPTIONS}
        onChange={(value) => {
          const next = USER_ROLES.find((item) => item === value);
          if (next) {
            setRole(next);
          }
        }}
      />
    </section>
  );
}
