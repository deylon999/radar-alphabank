import { Button } from '@alfalab/core-components/button/modern';

import { useMe } from '../../../api/hooks/auth';
import {
  useDecideJoinRequest,
  useJoinRequests,
  useMembers,
  useRemoveMember,
} from '../../../api/hooks/companies';
import { useMembership } from '../../../app/company/selectedCompanyContext';
import type { JoinRequest } from '../../../schemas/auth';
import { userRoleLabels } from '../../../shared/labels';
import { formatRelativeDate } from '../../../shared/lib/date';
import styles from './Team.module.css';

const MEMBER_ROLE = { owner: 'Владелец', member: 'Участник' } as const;

function RequestItem({ request, companyId }: { request: JoinRequest; companyId: string }) {
  const decide = useDecideJoinRequest(companyId);
  const busy = decide.isPending;
  return (
    <li className={styles.item}>
      <span className={styles.who}>{request.applicant.email}</span>
      <span className={styles.muted}>
        {[
          request.position ? userRoleLabels[request.position] : null,
          formatRelativeDate(request.createdAt),
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
      {request.message ? <span className={styles.message}>«{request.message}»</span> : null}
      <span className={styles.actions}>
        <Button
          view="primary"
          size={32}
          disabled={busy}
          aria-label={`Принять ${request.applicant.email}`}
          onClick={() => {
            decide.mutate({ requestId: request.id, decision: 'approve' });
          }}
        >
          Принять
        </Button>
        <Button
          view="secondary"
          size={32}
          disabled={busy}
          aria-label={`Отклонить ${request.applicant.email}`}
          onClick={() => {
            decide.mutate({ requestId: request.id, decision: 'reject' });
          }}
        >
          Отклонить
        </Button>
      </span>
    </li>
  );
}

/**
 * Сотрудники компании. Владелец видит заявки на вступление и решает по ним, может исключить
 * участника. Данные компании видят только участники — поэтому заявки и нужны.
 */
export function Team({ companyId }: { companyId: string }) {
  const membership = useMembership();
  const me = useMe();
  const isOwner = membership.role === 'owner';
  const members = useMembers(companyId);
  const requests = useJoinRequests(companyId, { enabled: isOwner });
  const remove = useRemoveMember(companyId);
  const pending = (requests.data ?? []).filter((request) => request.status === 'pending');

  return (
    <section aria-labelledby="team-title" className={styles.root}>
      <h2 id="team-title" className={styles.title}>
        Сотрудники
      </h2>
      {isOwner && pending.length > 0 ? (
        <div className={styles.block}>
          <h3 className={styles.subtitle}>Заявки на вступление</h3>
          <ul className={styles.list} aria-label="Заявки на вступление">
            {pending.map((request) => (
              <RequestItem key={request.id} request={request} companyId={companyId} />
            ))}
          </ul>
        </div>
      ) : null}
      {members.data ? (
        <ul className={styles.list} aria-label="Участники">
          {members.data.map((member) => (
            <li key={member.userId} className={styles.item}>
              <span className={styles.who}>
                {member.email}
                {member.userId === me.data?.user.id ? ' (вы)' : ''}
              </span>
              <span className={styles.muted}>
                {[
                  MEMBER_ROLE[member.role],
                  member.position ? userRoleLabels[member.position] : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {isOwner && member.role !== 'owner' ? (
                <span className={styles.actions}>
                  <Button
                    view="secondary"
                    size={32}
                    disabled={remove.isPending}
                    aria-label={`Исключить ${member.email}`}
                    onClick={() => {
                      remove.mutate(member.userId);
                    }}
                  >
                    Исключить
                  </Button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>
          {members.isError ? 'Не удалось загрузить участников' : 'Загружаем…'}
        </p>
      )}
    </section>
  );
}
