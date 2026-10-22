import { Button } from '@alfalab/core-components/button/modern';
import { useState } from 'react';

import { useCancelJoinRequest } from '../../api/hooks/companies';
import type { Me } from '../../schemas/auth';
import { type UserRole, USER_ROLES } from '../../schemas/user';
import { formatRelativeDate } from '../../shared/lib/date';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { NativeSelectField } from '../../shared/ui/NativeSelectField/NativeSelectField';
import { PageTitle } from '../../shared/ui/PageTitle';
import styles from './ConnectCompany.module.css';
import { CreateCompanyForm } from './CreateCompanyForm';
import { JoinCompanySearch } from './JoinCompanySearch';
import { POSITION_OPTIONS } from './positions';

/**
 * Пользователь ещё не в компании. Данные компании видят только её участники, поэтому сначала —
 * заявка в компанию (её одобряет владелец) или своя компания.
 */
export function ConnectCompany({ me }: { me: Me }) {
  useDocumentTitle('Подключение компании');
  const [position, setPosition] = useState<UserRole>('ceo');
  const request = me.joinRequest;
  const cancel = useCancelJoinRequest();

  if (request?.status === 'pending') {
    return (
      <section className={styles.root}>
        <PageTitle>Заявка отправлена</PageTitle>
        <div className={styles.card} role="status">
          <p className={styles.lead}>
            Заявка в «{request.company.name}» ждёт решения владельца компании. Отправлена{' '}
            {formatRelativeDate(request.createdAt)}.
          </p>
          <p className={styles.muted}>
            Когда владелец её примет, здесь появятся лента и аналитика компании.
          </p>
          <div>
            <Button
              view="secondary"
              size={40}
              loading={cancel.isPending}
              onClick={() => {
                cancel.mutate({ companyId: request.company.id, requestId: request.id });
              }}
            >
              Отменить заявку
            </Button>
          </div>
          {cancel.isError ? (
            <p className={styles.error} role="alert">
              Не удалось отменить заявку. Попробуйте ещё раз.
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.root}>
      <PageTitle>Подключите компанию</PageTitle>
      <p className={styles.intro}>
        Радар строит выводы по данным компании, а их видят только её сотрудники. Найдите свою
        компанию и подайте заявку — её примет владелец. Или создайте компанию, если её ещё нет.
      </p>
      {request?.status === 'rejected' ? (
        <p className={styles.notice} role="status">
          Заявку в «{request.company.name}» отклонили. Можно подать заявку снова или в другую
          компанию.
        </p>
      ) : null}
      <div className={styles.position}>
        <NativeSelectField
          label="Ваша должность"
          size={48}
          value={position}
          options={POSITION_OPTIONS}
          onChange={(value) => {
            const next = USER_ROLES.find((role) => role === value);
            if (next) setPosition(next);
          }}
        />
      </div>
      <JoinCompanySearch position={position} />
      <CreateCompanyForm position={position} />
    </section>
  );
}
